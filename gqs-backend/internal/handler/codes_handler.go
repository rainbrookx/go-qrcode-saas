package handler

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/rainbrookx/go-qrcode-saas/internal/repository"
	"github.com/rainbrookx/go-qrcode-saas/internal/response"
)

type CodesHandler struct {
	UrldynRepo     *repository.UrldynRepo
	ArticleRepo    *repository.ArticleRepo
	FormRepo       *repository.FormRepo
	AccessStatRepo *repository.AccessStatRepo
	BaseURL        string
}

func (h *CodesHandler) List(c *gin.Context) {
	userID := c.GetUint64("user_id")
	page := getIntQuery(c, "page", 1)
	pageSize := getIntQuery(c, "page_size", 20)
	if pageSize > 100 {
		pageSize = 100
	}
	codeType := c.Query("type")
	status := c.Query("status")
	keyword := c.Query("keyword")

	type codeItem struct {
		ID          uint64    `json:"id"`
		CodeType    string    `json:"type"`
		Code        string    `json:"code"`
		ShortURL    string    `json:"short_url"`
		Title       *string   `json:"title"`
		TargetURL   *string   `json:"target_url"`
		Status      string    `json:"status"`
		ExpiresAt   time.Time `json:"expires_at"`
		CreatedAt   time.Time `json:"created_at"`
		AccessCount int64     `json:"access_count"`
	}

	var allItems []codeItem
	now := time.Now()

	// Fetch urldyn codes
	if codeType == "" || codeType == "urldyn" {
		items, _, _ := h.UrldynRepo.ListByUser(userID, "", 1, 10000)
		for _, item := range items {
			if status != "" {
				s := computeStatus(item.ExpiresAt, now)
				if s != status {
					continue
				}
			}
			if keyword != "" && !contains(item.TargetURL, keyword) {
				continue
			}
			count, _ := h.AccessStatRepo.TotalCount("urldyn", item.ID)
			allItems = append(allItems, codeItem{
				ID:          item.ID,
				CodeType:    "urldyn",
				Code:        item.Code,
				ShortURL:    fmt.Sprintf("%s/u/%s", h.BaseURL, item.Code),
				TargetURL:   &item.TargetURL,
				Status:      computeStatus(item.ExpiresAt, now),
				ExpiresAt:   item.ExpiresAt,
				CreatedAt:   item.CreatedAt,
				AccessCount: count,
			})
		}
	}

	// Fetch articles
	if codeType == "" || codeType == "article" {
		items, _, _ := h.ArticleRepo.ListByUser(userID, "", 1, 10000)
		for _, item := range items {
			if status != "" {
				s := computeStatus(item.ExpiresAt, now)
				if s != status {
					continue
				}
			}
			if keyword != "" && !contains(item.Title, keyword) {
				continue
			}
			title := item.Title
			count, _ := h.AccessStatRepo.TotalCount("article", item.ID)
			allItems = append(allItems, codeItem{
				ID:          item.ID,
				CodeType:    "article",
				Code:        item.Code,
				ShortURL:    fmt.Sprintf("%s/a/%s", h.BaseURL, item.Code),
				Title:       &title,
				Status:      computeStatus(item.ExpiresAt, now),
				ExpiresAt:   item.ExpiresAt,
				CreatedAt:   item.CreatedAt,
				AccessCount: count,
			})
		}
	}

	// Fetch forms
	if codeType == "" || codeType == "form" {
		items, _, _ := h.FormRepo.ListByUser(userID, "", 1, 10000)
		for _, item := range items {
			if status != "" {
				s := computeStatus(item.ExpiresAt, now)
				if s != status {
					continue
				}
			}
			if keyword != "" && !contains(item.Title, keyword) {
				continue
			}
			title := item.Title
			count, _ := h.AccessStatRepo.TotalCount("form", item.ID)
			allItems = append(allItems, codeItem{
				ID:          item.ID,
				CodeType:    "form",
				Code:        item.Code,
				ShortURL:    fmt.Sprintf("%s/f/%s", h.BaseURL, item.Code),
				Title:       &title,
				Status:      computeStatus(item.ExpiresAt, now),
				ExpiresAt:   item.ExpiresAt,
				CreatedAt:   item.CreatedAt,
				AccessCount: count,
			})
		}
	}

	// Sort by created_at desc
	for i := 0; i < len(allItems); i++ {
		for j := i + 1; j < len(allItems); j++ {
			if allItems[j].CreatedAt.After(allItems[i].CreatedAt) {
				allItems[i], allItems[j] = allItems[j], allItems[i]
			}
		}
	}

	// Paginate
	total := int64(len(allItems))
	start := (page - 1) * pageSize
	if start > int(total) {
		start = int(total)
	}
	end := start + pageSize
	if end > int(total) {
		end = int(total)
	}
	paged := allItems[start:end]
	if paged == nil {
		paged = make([]codeItem, 0)
	}

	response.Success(c, response.PageData{
		List:     paged,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}

func contains(s, substr string) bool {
	return len(s) > 0 && len(substr) > 0 && len(s) >= len(substr) &&
		(s == substr || findSubstring(s, substr))
}

func findSubstring(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
