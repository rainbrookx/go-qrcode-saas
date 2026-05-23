package handler

import (
	"context"
	"fmt"
	"io"
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

func (h *UploadHandler) ServeFile(c *gin.Context) {
	objectKey := strings.TrimPrefix(c.Param("key"), "/")
	if objectKey == "" || !strings.HasPrefix(objectKey, "uploads/") || strings.Contains(objectKey, "..") {
		response.Error(c, http.StatusBadRequest, response.CodeGeneral, "文件路径不合法")
		return
	}

	object, err := h.Minio.GetObject(c.Request.Context(), objectKey)
	if err != nil {
		response.Error(c, http.StatusNotFound, response.CodeGeneral, "文件不存在")
		return
	}
	defer object.Close()

	ext := strings.ToLower(filepath.Ext(objectKey))
	c.Header("Content-Type", mimeTypeByExt(ext))
	c.Header("Cache-Control", "public, max-age=3600")
	c.Status(http.StatusOK)
	_, _ = io.Copy(c.Writer, object)
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

	response.Created(c, gin.H{
		"key":  objectKey,
		"name": header.Filename,
		"size": header.Size,
		"type": fileType,
		"url":  fmt.Sprintf("/api/v1/files/%s", objectKey),
	})
}

func mimeTypeByExt(ext string) string {
	switch ext {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	case ".svg":
		return "image/svg+xml"
	case ".mp4":
		return "video/mp4"
	case ".mp3":
		return "audio/mpeg"
	case ".pdf":
		return "application/pdf"
	default:
		return "application/octet-stream"
	}
}
