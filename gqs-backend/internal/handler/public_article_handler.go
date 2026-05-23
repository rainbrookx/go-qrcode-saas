package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/rainbrookx/go-qrcode-saas/internal/repository"
	"github.com/rainbrookx/go-qrcode-saas/internal/response"
	"github.com/rainbrookx/go-qrcode-saas/internal/storage"
)

type PublicArticleHandler struct {
	ArticleRepo           *repository.ArticleRepo
	ArticleAttachmentRepo *repository.ArticleAttachmentRepo
	AccessStatRepo        *repository.AccessStatRepo
	Minio                 *storage.MinIOClient
}

func (h *PublicArticleHandler) GetArticle(c *gin.Context) {
	code := c.Param("code")

	article, err := h.ArticleRepo.FindByCode(code)
	if err != nil {
		response.Error(c, http.StatusNotFound, response.CodeArticleNotFound, "文章不存在或已过期")
		return
	}

	if timeNow().After(article.ExpiresAt) {
		response.Error(c, http.StatusGone, response.CodeArticleExpired, "文章已过期")
		return
	}

	atts, _ := h.ArticleAttachmentRepo.FindByArticleID(article.ID)
	attsWithURL := make([]gin.H, len(atts))
	for i, a := range atts {
		url, _ := h.Minio.PresignedURL(c.Request.Context(), a.FileKey, time.Hour)
		attsWithURL[i] = gin.H{
			"type": a.FileType,
			"name": a.FileName,
			"url":  url,
		}
	}

	// Record access
	_ = h.AccessStatRepo.Increment("article", article.ID)

	response.Success(c, gin.H{
		"title":       article.Title,
		"content":     article.Content,
		"attachments": attsWithURL,
	})
}
