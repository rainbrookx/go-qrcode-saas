package storage

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"path/filepath"
	"strings"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type MinIOClient struct {
	Client *minio.Client
	Bucket string
}

func NewMinIOClient(endpoint, accessKey, secretKey, bucket string) (*MinIOClient, error) {
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: false,
	})
	if err != nil {
		return nil, fmt.Errorf("minio init: %w", err)
	}

	ctx := context.Background()
	exists, err := client.BucketExists(ctx, bucket)
	if err != nil {
		return nil, fmt.Errorf("minio bucket check: %w", err)
	}
	if !exists {
		if err := client.MakeBucket(ctx, bucket, minio.MakeBucketOptions{}); err != nil {
			return nil, fmt.Errorf("minio create bucket: %w", err)
		}
		slog.Info("minio bucket created", "bucket", bucket)
	}

	slog.Info("MinIO connected", "bucket", bucket)
	return &MinIOClient{Client: client, Bucket: bucket}, nil
}

func (m *MinIOClient) Upload(ctx context.Context, objectKey, fileName, contentType string, data ioReader, size int64) error {
	_, err := m.Client.PutObject(ctx, m.Bucket, objectKey, data, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	return err
}

func (m *MinIOClient) PresignedURL(ctx context.Context, objectKey string, expiry time.Duration) (string, error) {
	url, err := m.Client.PresignedGetObject(ctx, m.Bucket, objectKey, expiry, nil)
	if err != nil {
		return "", err
	}
	return url.String(), nil
}

func (m *MinIOClient) GetObject(ctx context.Context, objectKey string) (io.ReadCloser, error) {
	return m.Client.GetObject(ctx, m.Bucket, objectKey, minio.GetObjectOptions{})
}

type ioReader interface {
	Read(p []byte) (n int, err error)
}

// BlockedExtensions lists file extensions that are not allowed to upload
var BlockedExtensions = map[string]bool{
	".exe": true, ".bat": true, ".js": true, ".php": true, ".py": true,
}

// InferFileType maps extension to file type category
func InferFileType(ext string) string {
	ext = strings.ToLower(ext)
	switch ext {
	case ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp":
		return "image"
	case ".mp4", ".mov", ".avi", ".mkv", ".webm":
		return "video"
	case ".mp3", ".wav", ".ogg", ".flac", ".aac":
		return "audio"
	default:
		return "file"
	}
}

// MaxSizeByType returns max allowed size in bytes for a file type
func MaxSizeByType(purpose, fileType string) int64 {
	if purpose == "form" {
		return 10 * 1024 * 1024 // 10 MB for form uploads
	}
	switch fileType {
	case "image":
		return 5 * 1024 * 1024
	case "video":
		return 50 * 1024 * 1024
	case "audio":
		return 20 * 1024 * 1024
	default:
		return 50 * 1024 * 1024
	}
}

func GenerateObjectKey(purpose string, fileName string) string {
	ts := time.Now().Format("2006/01")
	ext := filepath.Ext(fileName)
	base := strings.TrimSuffix(fileName, ext)
	// sanitize: keep only alphanumeric, dash, underscore
	sanitized := strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			return r
		}
		return '_'
	}, base)
	return fmt.Sprintf("uploads/%s/%s/%d_%s%s", purpose, ts, time.Now().UnixNano(), sanitized, ext)
}
