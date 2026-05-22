package handler

import (
	"database/sql"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"

	"github.com/rainbrookx/go-qrcode-saas/internal/model"
	"github.com/rainbrookx/go-qrcode-saas/internal/repository"
	"github.com/rainbrookx/go-qrcode-saas/internal/response"
	"github.com/rainbrookx/go-qrcode-saas/internal/shortcode"
)

type FormHandler struct {
	FormRepo           *repository.FormRepo
	FormSubmissionRepo *repository.FormSubmissionRepo
	UrldynRepo         *repository.UrldynRepo
	ArticleRepo        *repository.ArticleRepo
	AccessStatRepo     *repository.AccessStatRepo
	BaseURL            string
}

func (h *FormHandler) Create(c *gin.Context) {
	userID := c.GetUint64("user_id")

	var req struct {
		Title          string                   `json:"title" binding:"required,max=200"`
		Fields         []map[string]interface{} `json:"fields" binding:"required,min=1,max=50"`
		MaxSubmissions *int                     `json:"max_submissions"`
		Deadline       *string                  `json:"deadline"`
		ExpiresIn      int                      `json:"expires_in" binding:"required,min=1,max=60"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.CodeGeneral, "参数校验失败："+err.Error())
		return
	}

	if len(req.Fields) < 1 {
		response.Error(c, http.StatusBadRequest, response.CodeGeneral, "至少需要 1 个字段")
		return
	}
	if len(req.Fields) > 50 {
		response.Error(c, http.StatusBadRequest, response.CodeGeneral, "字段最多 50 个")
		return
	}

	if !h.checkQuota(userID) {
		response.Error(c, http.StatusForbidden, response.CodeQuotaFull, "活码配额已满（已达 100 个上限）")
		return
	}

	code, err := h.generateCode()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
		return
	}

	fieldsJSON, _ := json.Marshal(req.Fields)

	form := &model.Form{
		UserID:    userID,
		Code:      code,
		Title:     req.Title,
		Fields:    string(fieldsJSON),
		ExpiresAt: time.Now().Add(time.Duration(req.ExpiresIn) * 24 * time.Hour),
	}

	if req.MaxSubmissions != nil {
		form.MaxSubmissions = sql.NullInt64{Int64: int64(*req.MaxSubmissions), Valid: true}
	}
	if req.Deadline != nil {
		t, err := time.Parse(time.RFC3339, *req.Deadline)
		if err == nil {
			form.Deadline = sql.NullTime{Time: t, Valid: true}
		}
	}

	if err := h.FormRepo.Create(form); err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
		return
	}

	response.Created(c, gin.H{
		"id":         form.ID,
		"code":       code,
		"short_url":  fmt.Sprintf("%s/f/%s", h.BaseURL, code),
		"title":      form.Title,
		"status":     "active",
		"expires_at": form.ExpiresAt,
		"created_at": form.CreatedAt,
	})
}

func (h *FormHandler) List(c *gin.Context) {
	userID := c.GetUint64("user_id")
	page := getIntQuery(c, "page", 1)
	pageSize := getIntQuery(c, "page_size", 20)
	if pageSize > 100 {
		pageSize = 100
	}
	status := c.Query("status")

	list, total, err := h.FormRepo.ListByUser(userID, status, page, pageSize)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
		return
	}

	now := time.Now()
	items := make([]gin.H, 0, len(list))
	for _, item := range list {
		subCount, _ := h.FormSubmissionRepo.CountByFormID(item.ID)
		items = append(items, gin.H{
			"id":               item.ID,
			"code":             item.Code,
			"short_url":        fmt.Sprintf("%s/f/%s", h.BaseURL, item.Code),
			"title":            item.Title,
			"status":           computeStatus(item.ExpiresAt, now),
			"submission_count": subCount,
			"max_submissions":  nullInt64Value(item.MaxSubmissions),
			"deadline":         nullTimeValue(item.Deadline),
			"expires_at":       item.ExpiresAt,
			"created_at":       item.CreatedAt,
		})
	}

	response.Success(c, response.PageData{
		List:     items,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}

func (h *FormHandler) Detail(c *gin.Context) {
	userID := c.GetUint64("user_id")
	id := getUint64Param(c, "id")

	form, err := h.FormRepo.FindByID(id, userID)
	if err != nil {
		response.Error(c, http.StatusNotFound, response.CodeFormNotFound, "资源不存在或不属于当前用户")
		return
	}

	var fields []map[string]interface{}
	json.Unmarshal([]byte(form.Fields), &fields)

	now := time.Now()
	subCount, _ := h.FormSubmissionRepo.CountByFormID(form.ID)
	stats, _ := h.AccessStatRepo.DailyStats("form", form.ID, 30)
	totalCount, _ := h.AccessStatRepo.TotalCount("form", form.ID)

	response.Success(c, gin.H{
		"id":               form.ID,
		"code":             form.Code,
		"short_url":        fmt.Sprintf("%s/f/%s", h.BaseURL, form.Code),
		"title":            form.Title,
		"fields":           fields,
		"max_submissions":  nullInt64Value(form.MaxSubmissions),
		"deadline":         nullTimeValue(form.Deadline),
		"status":           computeStatus(form.ExpiresAt, now),
		"submission_count": subCount,
		"access_count":     totalCount,
		"expires_at":       form.ExpiresAt,
		"created_at":       form.CreatedAt,
		"daily_stats":      stats,
	})
}

func (h *FormHandler) Update(c *gin.Context) {
	userID := c.GetUint64("user_id")
	id := getUint64Param(c, "id")

	form, err := h.FormRepo.FindByID(id, userID)
	if err != nil {
		response.Error(c, http.StatusNotFound, response.CodeFormNotFound, "资源不存在或不属于当前用户")
		return
	}
	if time.Now().After(form.ExpiresAt) {
		response.Error(c, http.StatusBadRequest, response.CodeFormExpired, "资源已过期，不可修改")
		return
	}

	var req struct {
		Title          string                   `json:"title"`
		Fields         []map[string]interface{} `json:"fields"`
		MaxSubmissions *int                     `json:"max_submissions"`
		Deadline       *string                  `json:"deadline"`
		ExpiresIn      *int                     `json:"expires_in"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.CodeGeneral, "参数校验失败")
		return
	}

	if req.Title != "" {
		form.Title = req.Title
	}
	if req.Fields != nil {
		if len(req.Fields) > 50 {
			response.Error(c, http.StatusBadRequest, response.CodeGeneral, "字段最多 50 个")
			return
		}
		fieldsJSON, _ := json.Marshal(req.Fields)
		form.Fields = string(fieldsJSON)
	}
	if req.MaxSubmissions != nil {
		if *req.MaxSubmissions == 0 {
			form.MaxSubmissions = sql.NullInt64{}
		} else {
			form.MaxSubmissions = sql.NullInt64{Int64: int64(*req.MaxSubmissions), Valid: true}
		}
	}
	if req.Deadline != nil {
		if *req.Deadline == "" {
			form.Deadline = sql.NullTime{}
		} else {
			t, err := time.Parse(time.RFC3339, *req.Deadline)
			if err == nil {
				form.Deadline = sql.NullTime{Time: t, Valid: true}
			}
		}
	}
	if req.ExpiresIn != nil {
		form.ExpiresAt = time.Now().Add(time.Duration(*req.ExpiresIn) * 24 * time.Hour)
	}

	if err := h.FormRepo.Update(form); err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
		return
	}

	response.Success(c, gin.H{
		"id":         form.ID,
		"code":       form.Code,
		"short_url":  fmt.Sprintf("%s/f/%s", h.BaseURL, form.Code),
		"title":      form.Title,
		"status":     computeStatus(form.ExpiresAt, time.Now()),
		"expires_at": form.ExpiresAt,
		"created_at": form.CreatedAt,
	})
}

func (h *FormHandler) Delete(c *gin.Context) {
	userID := c.GetUint64("user_id")
	id := getUint64Param(c, "id")

	if err := h.FormRepo.Delete(id, userID); err != nil {
		response.Error(c, http.StatusNotFound, response.CodeFormNotFound, "资源不存在或不属于当前用户")
		return
	}
	_ = h.FormSubmissionRepo.DeleteByFormID(id)

	response.Success(c, nil)
}

func (h *FormHandler) Submissions(c *gin.Context) {
	userID := c.GetUint64("user_id")
	formID := getUint64Param(c, "id")

	// verify ownership
	_, err := h.FormRepo.FindByID(formID, userID)
	if err != nil {
		response.Error(c, http.StatusNotFound, response.CodeFormNotFound, "资源不存在或不属于当前用户")
		return
	}

	page := getIntQuery(c, "page", 1)
	pageSize := getIntQuery(c, "page_size", 20)
	if pageSize > 100 {
		pageSize = 100
	}

	list, total, err := h.FormSubmissionRepo.ListByFormID(formID, page, pageSize)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
		return
	}

	items := make([]gin.H, len(list))
	for i, sub := range list {
		var values map[string]interface{}
		json.Unmarshal([]byte(sub.Values), &values)
		items[i] = gin.H{
			"id":           sub.ID,
			"values":       values,
			"submitted_at": sub.SubmittedAt,
		}
	}

	response.Success(c, response.PageData{
		List:     items,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}

func (h *FormHandler) Export(c *gin.Context) {
	userID := c.GetUint64("user_id")
	formID := getUint64Param(c, "id")
	format := c.Query("format")

	form, err := h.FormRepo.FindByID(formID, userID)
	if err != nil {
		response.Error(c, http.StatusNotFound, response.CodeFormNotFound, "资源不存在或不属于当前用户")
		return
	}

	var fields []map[string]interface{}
	json.Unmarshal([]byte(form.Fields), &fields)

	subs, err := h.FormSubmissionRepo.AllByFormID(formID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
		return
	}

	switch format {
	case "csv":
		h.exportCSV(c, fields, subs, formID)
	case "xlsx":
		h.exportXLSX(c, fields, subs, formID)
	default:
		response.Error(c, http.StatusBadRequest, response.CodeGeneral, "format 须为 csv 或 xlsx")
	}
}

func (h *FormHandler) exportCSV(c *gin.Context, fields []map[string]interface{}, subs []model.FormSubmission, formID uint64) {
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"form_%d.csv\"", formID))

	writer := csv.NewWriter(c.Writer)
	// BOM for Excel UTF-8 compat
	c.Writer.Write([]byte{0xEF, 0xBB, 0xBF})

	// Header
	headers := make([]string, len(fields)+1)
	for i, f := range fields {
		headers[i] = fmt.Sprintf("%v", f["label"])
	}
	headers[len(fields)] = "提交时间"
	writer.Write(headers)

	// Rows
	for _, sub := range subs {
		var values map[string]interface{}
		json.Unmarshal([]byte(sub.Values), &values)
		row := make([]string, len(fields)+1)
		for i, f := range fields {
			fieldID := fmt.Sprintf("%v", f["id"])
			row[i] = fmt.Sprintf("%v", values[fieldID])
		}
		row[len(fields)] = sub.SubmittedAt.Format("2006-01-02 15:04:05")
		writer.Write(row)
	}
	writer.Flush()
}

func (h *FormHandler) exportXLSX(c *gin.Context, fields []map[string]interface{}, subs []model.FormSubmission, formID uint64) {
	f := excelize.NewFile()
	defer f.Close()

	sheet := "Sheet1"
	// Header
	for i, field := range fields {
		col, _ := excelize.ColumnNumberToName(i + 1)
		f.SetCellValue(sheet, fmt.Sprintf("%s1", col), fmt.Sprintf("%v", field["label"]))
	}
	timeCol, _ := excelize.ColumnNumberToName(len(fields) + 1)
	f.SetCellValue(sheet, fmt.Sprintf("%s1", timeCol), "提交时间")

	// Rows
	for ri, sub := range subs {
		var values map[string]interface{}
		json.Unmarshal([]byte(sub.Values), &values)
		for i, field := range fields {
			fieldID := fmt.Sprintf("%v", field["id"])
			col, _ := excelize.ColumnNumberToName(i + 1)
			f.SetCellValue(sheet, fmt.Sprintf("%s%d", col, ri+2), fmt.Sprintf("%v", values[fieldID]))
		}
		f.SetCellValue(sheet, fmt.Sprintf("%s%d", timeCol, ri+2), sub.SubmittedAt.Format("2006-01-02 15:04:05"))
	}

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"form_%d.xlsx\"", formID))
	f.Write(c.Writer)
}

func (h *FormHandler) checkQuota(userID uint64) bool {
	urldynCount, _ := h.UrldynRepo.CountActiveByUser(userID)
	articleCount, _ := h.ArticleRepo.CountActiveByUser(userID)
	formCount, _ := h.FormRepo.CountActiveByUser(userID)
	return urldynCount+articleCount+formCount < maxActiveCodes
}

func (h *FormHandler) generateCode() (string, error) {
	for i := 0; i < 10; i++ {
		code, err := shortcode.Generate()
		if err != nil {
			return "", err
		}
		exists1, _ := h.FormRepo.CodeExists(code)
		exists2, _ := h.UrldynRepo.CodeExists(code)
		if !exists1 && !exists2 {
			return code, nil
		}
	}
	return "", fmt.Errorf("短码生成失败")
}

func nullInt64Value(n sql.NullInt64) *int64 {
	if n.Valid {
		return &n.Int64
	}
	return nil
}

func nullTimeValue(n sql.NullTime) *string {
	if n.Valid {
		s := n.Time.Format(time.RFC3339)
		return &s
	}
	return nil
}
