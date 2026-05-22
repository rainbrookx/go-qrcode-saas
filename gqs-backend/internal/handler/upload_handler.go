package handler

import (
	"context"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/rainbrookx/go-qrcode-saas/internal/response"
	"github.com/rainbrookx/go-qrcode-saas/internal/storage"
)

type UploadHandler struct {
	Minio *storage.MinIOClient
}

func (h *UploadHandler) Upload(c *gin.Context) {
	purpose := c.PostForm("purpose")
	if purpose != "article" && purpose != "form" {
		response.Error(c, http.StatusBadRequest, response.CodeGeneral, "purpose 须为 article 或 form")
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		response.Error(c, http.StatusBadRequest, response.CodeGeneral, "未找到上传文件")
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))

	// Block forbidden extensions
	if storage.BlockedExtensions[ext] {
		response.Error(c, http.StatusBadRequest, response.CodeUploadType, "文件类型被禁止")
		return
	}

	fileType := storage.InferFileType(ext)
	maxSize := storage.MaxSizeByType(purpose, fileType)

	if header.Size > maxSize {
		response.Error(c, http.StatusBadRequest, response.CodeUploadSize, "文件大小超限")
		return
	}

	objectKey := storage.GenerateObjectKey(purpose, header.Filename)
	contentType := header.Header.Get("Content-Type")

	ctx := context.Background()
	if err := h.Minio.Upload(ctx, objectKey, header.Filename, contentType, file, header.Size); err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeUploadFail, "上传失败")
		return
	}

	presignedURL, _ := h.Minio.PresignedURL(ctx, objectKey, 3600)

	response.Created(c, gin.H{
		"key":  objectKey,
		"name": header.Filename,
		"size": header.Size,
		"type": fileType,
		"url":  presignedURL,
	})
}
