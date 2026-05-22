package main

import (
	"log/slog"
	"os"

	"github.com/gin-gonic/gin"

	"github.com/rainbrookx/go-qrcode-saas/internal/config"
	"github.com/rainbrookx/go-qrcode-saas/internal/database"
	"github.com/rainbrookx/go-qrcode-saas/internal/middleware"
)

func main() {
	cfg := config.Load()

	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))

	db := database.InitMySQL(cfg.DBDsn)

	r := gin.Default()
	r.Use(middleware.CORS())

	api := r.Group("/api/v1")
	{
		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok"})
		})
	}

	// register route groups (to be added in later phases)
	_ = db

	slog.Info("server starting", "port", 8080)
	if err := r.Run(":8080"); err != nil {
		slog.Error("server failed", "error", err)
		os.Exit(1)
	}
}