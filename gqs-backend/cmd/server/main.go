package main

import (
	"log/slog"
	"os"

	"github.com/gin-gonic/gin"

	"github.com/rainbrookx/go-qrcode-saas/internal/auth"
	"github.com/rainbrookx/go-qrcode-saas/internal/config"
	"github.com/rainbrookx/go-qrcode-saas/internal/database"
	"github.com/rainbrookx/go-qrcode-saas/internal/handler"
	"github.com/rainbrookx/go-qrcode-saas/internal/middleware"
	"github.com/rainbrookx/go-qrcode-saas/internal/repository"
)

func main() {
	cfg := config.Load()

	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))

	db := database.InitMySQL(cfg.DBDsn)

	// Repositories
	userRepo := repository.NewUserRepo(db)
	refreshTokenRepo := repository.NewRefreshTokenRepo(db)
	emailCodeRepo := repository.NewEmailCodeRepo(db)

	// Auth handler
	mailer := auth.NewMailer(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPass, cfg.SMTPFrom)
	authHandler := &handler.AuthHandler{
		UserRepo:         userRepo,
		RefreshTokenRepo: refreshTokenRepo,
		EmailCodeRepo:    emailCodeRepo,
		JWTSecret:        cfg.JWTSecret,
		Mailer:           mailer,
	}

	r := gin.Default()
	r.Use(middleware.CORS())

	api := r.Group("/api/v1")
	// Public auth routes
	authGroup := api.Group("/auth")
	{
		authGroup.POST("/register", authHandler.Register)
		authGroup.POST("/login", authHandler.Login)
		authGroup.POST("/verify-code", authHandler.SendVerifyCode)
		authGroup.POST("/reset-password", authHandler.ResetPassword)
		authGroup.POST("/refresh", authHandler.Refresh)
	}
	// Protected auth routes
	authProtected := api.Group("/auth").Use(middleware.Auth(cfg.JWTSecret))
	{
		authProtected.POST("/change-password", authHandler.ChangePassword)
		authProtected.GET("/me", authHandler.Me)
	}
	// User routes
	userGroup := api.Group("/user").Use(middleware.Auth(cfg.JWTSecret))
	{
		userGroup.GET("/quota", authHandler.Quota)
	}

	api.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	slog.Info("server starting", "port", 8080)
	if err := r.Run(":8080"); err != nil {
		slog.Error("server failed", "error", err)
		os.Exit(1)
	}
}
