package handler

import (
	"fmt"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"

	"github.com/rainbrookx/go-qrcode-saas/internal/model"
	"github.com/rainbrookx/go-qrcode-saas/internal/repository"
	"github.com/rainbrookx/go-qrcode-saas/internal/response"
	"github.com/rainbrookx/go-qrcode-saas/internal/shortcode"
	"github.com/rainbrookx/go-qrcode-saas/internal/storage"
)

type ArticleHandler struct {
	ArticleRepo           *repository.ArticleRepo
	ArticleAttachmentRepo *repository.ArticleAttachmentRepo
	UrldynRepo            *repository.UrldynRepo
	FormRepo              *repository.FormRepo
	AccessStatRepo        *repository.AccessStatRepo
	Minio                 *storage.MinIOClient
	BaseURL               string
}

func (h *ArticleHandler) Create(c *gin.Context) {
	userID := c.GetUint64("user_id")

	var req struct {
		Title       string                 `json:"title" binding:"required,max=200"`
		Content     string                 `json:"content" binding:"required"`
		Attachments []articleAttachmentReq `json:"attachments"`
		ExpiresIn   int                    `json:"expires_in" binding:"required,min=1,max=60"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.CodeGeneral, "参数校验失败："+err.Error())
		return
	}

	// Validate content length
	charCount := utf8.RuneCountInString(stripHTML(req.Content))
	if charCount > 50000 {
		response.Error(c, http.StatusBadRequest, response.CodeGeneral, fmt.Sprintf("内容超长：%d/50000 字", charCount))
		return
	}

	// Validate attachments
	if err := h.validateAttachments(req.Attachments); err != nil {
		response.Error(c, http.StatusBadRequest, response.CodeGeneral, err.Error())
		return
	}

	// Quota check
	if !h.checkQuota(userID) {
		response.Error(c, http.StatusForbidden, response.CodeQuotaFull, "活码配额已满（已达 100 个上限）")
		return
	}

	// Generate unique short code
	code, err := h.generateCode()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
		return
	}

	article := &model.Article{
		UserID:    userID,
		Code:      code,
		Title:     req.Title,
		Content:   req.Content,
		ExpiresAt: time.Now().Add(time.Duration(req.ExpiresIn) * 24 * time.Hour),
	}
	if err := h.ArticleRepo.Create(article); err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
		return
	}

	// Save attachments
	if len(req.Attachments) > 0 {
		atts := make([]model.ArticleAttachment, len(req.Attachments))
		for i, a := range req.Attachments {
			atts[i] = model.ArticleAttachment{
				ArticleID: article.ID,
				FileKey:   a.Key,
				FileType:  a.Type,
				FileName:  a.Name,
				FileSize:  a.Size,
			}
		}
		_ = h.ArticleAttachmentRepo.CreateBatch(atts)
	}

	response.Created(c, gin.H{
		"id":         article.ID,
		"code":       code,
		"short_url":  fmt.Sprintf("%s/a/%s", h.BaseURL, code),
		"title":      article.Title,
		"status":     "active",
		"expires_at": article.ExpiresAt,
		"created_at": article.CreatedAt,
	})
}

func (h *ArticleHandler) List(c *gin.Context) {
	userID := c.GetUint64("user_id")
	page := getIntQuery(c, "page", 1)
	pageSize := getIntQuery(c, "page_size", 20)
	if pageSize > 100 {
		pageSize = 100
	}
	status := c.Query("status")

	list, total, err := h.ArticleRepo.ListByUser(userID, status, page, pageSize)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
		return
	}

	now := time.Now()
	items := make([]gin.H, 0, len(list))
	for _, item := range list {
		count, _ := h.AccessStatRepo.TotalCount("article", item.ID)
		items = append(items, gin.H{
			"id":           item.ID,
			"code":         item.Code,
			"short_url":    fmt.Sprintf("%s/a/%s", h.BaseURL, item.Code),
			"title":        item.Title,
			"status":       computeStatus(item.ExpiresAt, now),
			"expires_at":   item.ExpiresAt,
			"created_at":   item.CreatedAt,
			"access_count": count,
		})
	}

	response.Success(c, response.PageData{
		List:     items,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}

func (h *ArticleHandler) Detail(c *gin.Context) {
	userID := c.GetUint64("user_id")
	id := getUint64Param(c, "id")

	article, err := h.ArticleRepo.FindByID(id, userID)
	if err != nil {
		response.Error(c, http.StatusNotFound, response.CodeArticleNotFound, "资源不存在或不属于当前用户")
		return
	}

	atts, _ := h.ArticleAttachmentRepo.FindByArticleID(article.ID)
	attsWithURL := make([]gin.H, len(atts))
	for i, a := range atts {
		url, _ := h.Minio.PresignedURL(c.Request.Context(), a.FileKey, time.Hour)
		attsWithURL[i] = gin.H{
			"key":  a.FileKey,
			"type": a.FileType,
			"name": a.FileName,
			"size": a.FileSize,
			"url":  url,
		}
	}

	now := time.Now()
	stats, _ := h.AccessStatRepo.DailyStats("article", article.ID, 30)
	totalCount, _ := h.AccessStatRepo.TotalCount("article", article.ID)

	response.Success(c, gin.H{
		"id":           article.ID,
		"code":         article.Code,
		"short_url":    fmt.Sprintf("%s/a/%s", h.BaseURL, article.Code),
		"title":        article.Title,
		"content":      article.Content,
		"attachments":  attsWithURL,
		"status":       computeStatus(article.ExpiresAt, now),
		"expires_at":   article.ExpiresAt,
		"created_at":   article.CreatedAt,
		"access_count": totalCount,
		"daily_stats":  stats,
	})
}

func (h *ArticleHandler) Update(c *gin.Context) {
	userID := c.GetUint64("user_id")
	id := getUint64Param(c, "id")

	article, err := h.ArticleRepo.FindByID(id, userID)
	if err != nil {
		response.Error(c, http.StatusNotFound, response.CodeArticleNotFound, "资源不存在或不属于当前用户")
		return
	}
	if time.Now().After(article.ExpiresAt) {
		response.Error(c, http.StatusBadRequest, response.CodeArticleExpired, "资源已过期，不可修改")
		return
	}

	var req struct {
		Title       string                 `json:"title"`
		Content     string                 `json:"content"`
		Attachments []articleAttachmentReq `json:"attachments"`
		ExpiresIn   *int                   `json:"expires_in"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.CodeGeneral, "参数校验失败")
		return
	}

	if req.Title != "" {
		if len(req.Title) > 200 {
			response.Error(c, http.StatusBadRequest, response.CodeGeneral, "标题过长（最多200字符）")
			return
		}
		article.Title = req.Title
	}
	if req.Content != "" {
		charCount := utf8.RuneCountInString(stripHTML(req.Content))
		if charCount > 50000 {
			response.Error(c, http.StatusBadRequest, response.CodeGeneral, fmt.Sprintf("内容超长：%d/50000 字", charCount))
			return
		}
		article.Content = req.Content
	}
	if req.Attachments != nil {
		if err := h.validateAttachments(req.Attachments); err != nil {
			response.Error(c, http.StatusBadRequest, response.CodeGeneral, err.Error())
			return
		}
		// Replace attachments: delete old, add new
		_ = h.ArticleAttachmentRepo.DeleteByArticleID(article.ID)
		atts := make([]model.ArticleAttachment, len(req.Attachments))
		for i, a := range req.Attachments {
			atts[i] = model.ArticleAttachment{
				ArticleID: article.ID,
				FileKey:   a.Key,
				FileType:  a.Type,
				FileName:  a.Name,
				FileSize:  a.Size,
			}
		}
		_ = h.ArticleAttachmentRepo.CreateBatch(atts)
	}
	if req.ExpiresIn != nil {
		if *req.ExpiresIn < 1 || *req.ExpiresIn > 60 {
			response.Error(c, http.StatusBadRequest, response.CodeGeneral, "有效期须在 1-60 天之间")
			return
		}
		article.ExpiresAt = time.Now().Add(time.Duration(*req.ExpiresIn) * 24 * time.Hour)
	}

	if err := h.ArticleRepo.Update(article); err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
		return
	}

	response.Success(c, gin.H{
		"id":         article.ID,
		"code":       article.Code,
		"short_url":  fmt.Sprintf("%s/a/%s", h.BaseURL, article.Code),
		"title":      article.Title,
		"status":     computeStatus(article.ExpiresAt, time.Now()),
		"expires_at": article.ExpiresAt,
		"created_at": article.CreatedAt,
	})
}

func (h *ArticleHandler) Delete(c *gin.Context) {
	userID := c.GetUint64("user_id")
	id := getUint64Param(c, "id")

	if err := h.ArticleRepo.Delete(id, userID); err != nil {
		response.Error(c, http.StatusNotFound, response.CodeArticleNotFound, "资源不存在或不属于当前用户")
		return
	}
	// Clean up attachments (async in production)
	_ = h.ArticleAttachmentRepo.DeleteByArticleID(id)

	response.Success(c, nil)
}

type articleAttachmentReq struct {
	Key  string `json:"key"`
	Type string `json:"type"`
	Name string `json:"name"`
	Size uint64 `json:"size"`
}

func (h *ArticleHandler) validateAttachments(atts []articleAttachmentReq) error {
	videoFileCount := 0
	for _, a := range atts {
		if a.Type == "video" || a.Type == "file" {
			videoFileCount++
		}
		maxSize := storage.MaxSizeByType("article", a.Type)
		if a.Size > uint64(maxSize) {
			return fmt.Errorf("文件 %s 大小超限", a.Name)
		}
	}
	if videoFileCount > 1 {
		return fmt.Errorf("视频与通用文件附件之和最多为 1")
	}
	return nil
}

func (h *ArticleHandler) checkQuota(userID uint64) bool {
	urldynCount, _ := h.UrldynRepo.CountActiveByUser(userID)
	articleCount, _ := h.ArticleRepo.CountActiveByUser(userID)
	formCount, _ := h.FormRepo.CountActiveByUser(userID)
	return urldynCount+articleCount+formCount < maxActiveCodes
}

func (h *ArticleHandler) generateCode() (string, error) {
	for i := 0; i < 10; i++ {
		code, err := shortcode.Generate()
		if err != nil {
			return "", err
		}
		exists1, _ := h.ArticleRepo.CodeExists(code)
		exists2, _ := h.UrldynRepo.CodeExists(code)
		if !exists1 && !exists2 {
			return code, nil
		}
	}
	return "", fmt.Errorf("短码生成失败")
}

func stripHTML(html string) string {
	inTag := false
	var b strings.Builder
	for _, r := range html {
		if r == '<' {
			inTag = true
			continue
		}
		if r == '>' {
			inTag = false
			continue
		}
		if !inTag {
			b.WriteRune(r)
		}
	}
	return b.String()
}
