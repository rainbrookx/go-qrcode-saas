package handler

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/rainbrookx/go-qrcode-saas/internal/model"
	"github.com/rainbrookx/go-qrcode-saas/internal/repository"
	"github.com/rainbrookx/go-qrcode-saas/internal/response"
)

type PublicFormHandler struct {
	FormRepo           *repository.FormRepo
	FormSubmissionRepo *repository.FormSubmissionRepo
	AccessStatRepo     *repository.AccessStatRepo
}

func (h *PublicFormHandler) GetForm(c *gin.Context) {
	code := c.Param("code")

	form, err := h.FormRepo.FindByCode(code)
	if err != nil {
		response.Error(c, http.StatusNotFound, response.CodeFormGone, "表单不存在或已过期")
		return
	}

	if timeNow().After(form.ExpiresAt) {
		response.Error(c, http.StatusGone, response.CodeFormGone, "表单已过期")
		return
	}

	// Check submission limit
	if form.MaxSubmissions.Valid {
		count, _ := h.FormSubmissionRepo.CountByFormID(form.ID)
		if count >= form.MaxSubmissions.Int64 {
			response.Error(c, http.StatusForbidden, response.CodeFormStopped, "表单已停止收集（达到提交上限）")
			return
		}
	}

	// Check deadline
	if form.Deadline.Valid && timeNow().After(form.Deadline.Time) {
		response.Error(c, http.StatusForbidden, response.CodeFormStopped, "表单已停止收集（超过截止时间）")
		return
	}

	var fields []map[string]interface{}
	json.Unmarshal([]byte(form.Fields), &fields)

	subCount, _ := h.FormSubmissionRepo.CountByFormID(form.ID)

	response.Success(c, gin.H{
		"title":            form.Title,
		"fields":           fields,
		"max_submissions":  nullInt64Json(form.MaxSubmissions),
		"submission_count": subCount,
		"deadline":         nullTimeJson(form.Deadline),
	})
}

func (h *PublicFormHandler) Submit(c *gin.Context) {
	code := c.Param("code")

	form, err := h.FormRepo.FindByCode(code)
	if err != nil || timeNow().After(form.ExpiresAt) {
		response.Error(c, http.StatusNotFound, response.CodeFormGone, "表单不存在或已过期")
		return
	}

	// Rate limit: 1 per 10s per IP
	ip := c.ClientIP()
	lastTime, err := h.FormSubmissionRepo.LastSubmissionTime(ip)
	if err == nil && time.Since(lastTime) < 10*time.Second {
		response.Error(c, http.StatusTooManyRequests, response.CodeSubmitFrequent, "提交过于频繁，请 10 秒后重试")
		return
	}

	// Check constraints
	if form.MaxSubmissions.Valid {
		count, _ := h.FormSubmissionRepo.CountByFormID(form.ID)
		if count >= form.MaxSubmissions.Int64 {
			response.Error(c, http.StatusForbidden, response.CodeFormStopped, "表单已停止收集")
			return
		}
	}
	if form.Deadline.Valid && timeNow().After(form.Deadline.Time) {
		response.Error(c, http.StatusForbidden, response.CodeFormStopped, "表单已停止收集")
		return
	}

	var req struct {
		Values map[string]interface{} `json:"values" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.CodeGeneral, "参数校验失败")
		return
	}

	// Validate required fields
	var fields []map[string]interface{}
	json.Unmarshal([]byte(form.Fields), &fields)
	for _, f := range fields {
		required, _ := f["required"].(bool)
		fieldID, _ := f["id"].(string)
		if required {
			val, ok := req.Values[fieldID]
			if !ok || val == nil || val == "" {
				response.Error(c, http.StatusBadRequest, response.CodeGeneral, "必填字段未填写："+fieldID)
				return
			}
		}
	}

	valuesJSON, _ := json.Marshal(req.Values)
	sub := &model.FormSubmission{
		FormID:    form.ID,
		Values:    string(valuesJSON),
		IPAddress: ip,
	}
	if err := h.FormSubmissionRepo.Create(sub); err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
		return
	}

	_ = h.AccessStatRepo.Increment("form", form.ID)

	response.Created(c, nil)
}

func nullInt64Json(n sql.NullInt64) *int64 {
	if n.Valid {
		return &n.Int64
	}
	return nil
}

func nullTimeJson(n sql.NullTime) *string {
	if n.Valid {
		s := n.Time.Format(time.RFC3339)
		return &s
	}
	return nil
}
