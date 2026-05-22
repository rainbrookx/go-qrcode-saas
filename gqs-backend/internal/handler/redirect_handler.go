package handler

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/rainbrookx/go-qrcode-saas/internal/repository"
)

type RedirectHandler struct {
	UrldynRepo     *repository.UrldynRepo
	ArticleRepo    *repository.ArticleRepo
	FormRepo       *repository.FormRepo
	AccessStatRepo *repository.AccessStatRepo
	BaseURL        string
}

func (h *RedirectHandler) RedirectURL(c *gin.Context) {
	code := c.Param("code")
	item, err := h.UrldynRepo.FindByCode(code)
	if err != nil {
		c.HTML(http.StatusNotFound, "404.html", nil)
		return
	}

	// Check expiry
	now := timeNow()
	if now.After(item.ExpiresAt) {
		c.HTML(http.StatusGone, "410.html", nil)
		return
	}

	// Security: validate target URL
	target, err := url.Parse(item.TargetURL)
	if err != nil || (target.Scheme != "http" && target.Scheme != "https") {
		c.HTML(http.StatusNotFound, "404.html", nil)
		return
	}

	// Prevent open redirect to self
	if strings.Contains(target.Host, h.BaseURL) || strings.Contains(h.BaseURL, target.Host) {
		c.HTML(http.StatusNotFound, "404.html", nil)
		return
	}

	// Record access
	_ = h.AccessStatRepo.Increment("urldyn", item.ID)

	c.Redirect(http.StatusFound, item.TargetURL)
}

func (h *RedirectHandler) RedirectArticle(c *gin.Context) {
	code := c.Param("code")
	item, err := h.ArticleRepo.FindByCode(code)
	if err != nil || timeNow().After(item.ExpiresAt) {
		c.HTML(http.StatusGone, "410.html", nil)
		return
	}
	_ = h.AccessStatRepo.Increment("article", item.ID)
	// Redirect to frontend article page
	c.Redirect(http.StatusFound, fmt.Sprintf("/a/%s", code))
}

func (h *RedirectHandler) RedirectForm(c *gin.Context) {
	code := c.Param("code")
	item, err := h.FormRepo.FindByCode(code)
	if err != nil || timeNow().After(item.ExpiresAt) {
		c.HTML(http.StatusGone, "410.html", nil)
		return
	}
	_ = h.AccessStatRepo.Increment("form", item.ID)
	c.Redirect(http.StatusFound, fmt.Sprintf("/f/%s", code))
}
