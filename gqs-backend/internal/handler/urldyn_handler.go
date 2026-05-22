package handler

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/rainbrookx/go-qrcode-saas/internal/model"
	"github.com/rainbrookx/go-qrcode-saas/internal/repository"
	"github.com/rainbrookx/go-qrcode-saas/internal/response"
	"github.com/rainbrookx/go-qrcode-saas/internal/shortcode"
)

type UrldynHandler struct {
	UrldynRepo     *repository.UrldynRepo
	AccessStatRepo *repository.AccessStatRepo
	ArticleRepo    *repository.ArticleRepo
	FormRepo       *repository.FormRepo
	BaseURL        string
}

const maxActiveCodes = 100

func (h *UrldynHandler) Create(c *gin.Context) {
	userID := c.GetUint64("user_id")

	var req struct {
		TargetURL string `json:"target_url" binding:"required,http_url,max=2048"`
		ExpiresIn int    `json:"expires_in" binding:"required,min=1,max=60"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.CodeGeneral, "参数校验失败："+err.Error())
		return
	}

	// Security: block javascript protocol
	if !strings.HasPrefix(req.TargetURL, "http://") && !strings.HasPrefix(req.TargetURL, "https://") {
		response.Error(c, http.StatusBadRequest, response.CodeGeneral, "URL 格式不合法")
		return
	}

	// Quota check
	if !h.checkQuota(userID) {
		response.Error(c, http.StatusForbidden, response.CodeQuotaFull, "活码配额已满（已达 100 个上限）")
		return
	}

	// Generate unique short code
	var code string
	var err error
	for i := 0; i < 10; i++ {
		code, err = shortcode.Generate()
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
			return
		}
		exists, _ := h.UrldynRepo.CodeExists(code)
		if !exists {
			break
		}
	}
	if code == "" {
		response.Error(c, http.StatusInternalServerError, response.CodeServerError, "短码生成失败")
		return
	}

	record := &model.UrldynCode{
		UserID:    userID,
		Code:      code,
		TargetURL: req.TargetURL,
		ExpiresAt: time.Now().Add(time.Duration(req.ExpiresIn) * 24 * time.Hour),
	}
	if err := h.UrldynRepo.Create(record); err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
		return
	}

	shortURL := fmt.Sprintf("%s/u/%s", h.BaseURL, code)
	response.Created(c, gin.H{
		"id":         record.ID,
		"code":       code,
		"short_url":  shortURL,
		"target_url": record.TargetURL,
		"expires_at": record.ExpiresAt,
		"created_at": record.CreatedAt,
	})
}

func (h *UrldynHandler) List(c *gin.Context) {
	userID := c.GetUint64("user_id")
	page := getIntQuery(c, "page", 1)
	pageSize := getIntQuery(c, "page_size", 20)
	if pageSize > 100 {
		pageSize = 100
	}
	status := c.Query("status")

	list, total, err := h.UrldynRepo.ListByUser(userID, status, page, pageSize)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
		return
	}

	now := time.Now()
	items := make([]gin.H, 0, len(list))
	for _, item := range list {
		items = append(items, h.toListItem(&item, now))
	}

	response.Success(c, response.PageData{
		List:     items,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}

func (h *UrldynHandler) Detail(c *gin.Context) {
	userID := c.GetUint64("user_id")
	id := getUint64Param(c, "id")

	item, err := h.UrldynRepo.FindByID(id, userID)
	if err != nil {
		response.Error(c, http.StatusNotFound, response.CodeUrldynNotFound, "资源不存在或不属于当前用户")
		return
	}

	now := time.Now()
	stats, _ := h.AccessStatRepo.DailyStats("urldyn", item.ID, 30)
	totalCount, _ := h.AccessStatRepo.TotalCount("urldyn", item.ID)

	response.Success(c, gin.H{
		"id":           item.ID,
		"code":         item.Code,
		"short_url":    fmt.Sprintf("%s/u/%s", h.BaseURL, item.Code),
		"target_url":   item.TargetURL,
		"status":       computeStatus(item.ExpiresAt, now),
		"expires_at":   item.ExpiresAt,
		"created_at":   item.CreatedAt,
		"access_count": totalCount,
		"daily_stats":  stats,
	})
}

func (h *UrldynHandler) Update(c *gin.Context) {
	userID := c.GetUint64("user_id")
	id := getUint64Param(c, "id")

	item, err := h.UrldynRepo.FindByID(id, userID)
	if err != nil {
		response.Error(c, http.StatusNotFound, response.CodeUrldynNotFound, "资源不存在或不属于当前用户")
		return
	}
	if time.Now().After(item.ExpiresAt) {
		response.Error(c, http.StatusBadRequest, response.CodeUrldynExpired, "资源已过期，不可修改")
		return
	}

	var req struct {
		TargetURL string `json:"target_url"`
		ExpiresIn *int   `json:"expires_in"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.CodeGeneral, "参数校验失败")
		return
	}

	if req.TargetURL != "" {
		if !strings.HasPrefix(req.TargetURL, "http://") && !strings.HasPrefix(req.TargetURL, "https://") {
			response.Error(c, http.StatusBadRequest, response.CodeGeneral, "URL 格式不合法")
			return
		}
		item.TargetURL = req.TargetURL
	}
	if req.ExpiresIn != nil {
		if *req.ExpiresIn < 1 || *req.ExpiresIn > 60 {
			response.Error(c, http.StatusBadRequest, response.CodeGeneral, "有效期须在 1-60 天之间")
			return
		}
		item.ExpiresAt = time.Now().Add(time.Duration(*req.ExpiresIn) * 24 * time.Hour)
	}

	if err := h.UrldynRepo.Update(item); err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
		return
	}

	response.Success(c, gin.H{
		"id":         item.ID,
		"code":       item.Code,
		"short_url":  fmt.Sprintf("%s/u/%s", h.BaseURL, item.Code),
		"target_url": item.TargetURL,
		"status":     computeStatus(item.ExpiresAt, time.Now()),
		"expires_at": item.ExpiresAt,
		"created_at": item.CreatedAt,
	})
}

func (h *UrldynHandler) Delete(c *gin.Context) {
	userID := c.GetUint64("user_id")
	id := getUint64Param(c, "id")

	if err := h.UrldynRepo.Delete(id, userID); err != nil {
		response.Error(c, http.StatusNotFound, response.CodeUrldynNotFound, "资源不存在或不属于当前用户")
		return
	}

	response.Success(c, nil)
}

func (h *UrldynHandler) toListItem(item *model.UrldynCode, now time.Time) gin.H {
	return gin.H{
		"id":           item.ID,
		"code":         item.Code,
		"short_url":    fmt.Sprintf("%s/u/%s", h.BaseURL, item.Code),
		"target_url":   item.TargetURL,
		"status":       computeStatus(item.ExpiresAt, now),
		"expires_at":   item.ExpiresAt,
		"created_at":   item.CreatedAt,
	}
}

func (h *UrldynHandler) checkQuota(userID uint64) bool {
	urldynCount, _ := h.UrldynRepo.CountActiveByUser(userID)
	articleCount := int64(0)
	formCount := int64(0)
	if h.ArticleRepo != nil {
		articleCount, _ = h.ArticleRepo.CountActiveByUser(userID)
	}
	if h.FormRepo != nil {
		formCount, _ = h.FormRepo.CountActiveByUser(userID)
	}
	return urldynCount+articleCount+formCount < maxActiveCodes
}

func computeStatus(expiresAt, now time.Time) string {
	if now.After(expiresAt) {
		return "expired"
	}
	if expiresAt.Sub(now) <= 72*time.Hour {
		return "expiring_soon"
	}
	return "active"
}
