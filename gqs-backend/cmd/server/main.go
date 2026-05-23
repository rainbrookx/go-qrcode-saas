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
	"github.com/rainbrookx/go-qrcode-saas/internal/storage"
)

func main() {
	cfg := config.Load()

	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))

	db := database.InitMySQL(cfg.DBDsn)

	// Repositories
	userRepo := repository.NewUserRepo(db)
	refreshTokenRepo := repository.NewRefreshTokenRepo(db)
	emailCodeRepo := repository.NewEmailCodeRepo(db)
	urldynRepo := repository.NewUrldynRepo(db)
	accessStatRepo := repository.NewAccessStatRepo(db)
	articleRepo := repository.NewArticleRepo(db)
	articleAttachmentRepo := repository.NewArticleAttachmentRepo(db)
	formRepo := repository.NewFormRepo(db)
	formSubmissionRepo := repository.NewFormSubmissionRepo(db)

	minioClient, err := storage.NewMinIOClient(cfg.MinioEndpoint, cfg.MinioAccess, cfg.MinioSecret, cfg.MinioBucket)
	if err != nil {
		slog.Error("minio init failed", "error", err)
		os.Exit(1)
	}

	// Auth handler
	mailer := auth.NewMailer(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPass, cfg.SMTPFrom)
	authHandler := &handler.AuthHandler{
		UserRepo:         userRepo,
		RefreshTokenRepo: refreshTokenRepo,
		EmailCodeRepo:    emailCodeRepo,
		JWTSecret:        cfg.JWTSecret,
		Mailer:           mailer,
	}

	// Urldyn handler
	urldynHandler := &handler.UrldynHandler{
		UrldynRepo:     urldynRepo,
		AccessStatRepo: accessStatRepo,
		ArticleRepo:    articleRepo,
		FormRepo:       formRepo,
		BaseURL:        cfg.BaseURL,
	}

	// Article handler
	articleHandler := &handler.ArticleHandler{
		ArticleRepo:           articleRepo,
		ArticleAttachmentRepo: articleAttachmentRepo,
		UrldynRepo:            urldynRepo,
		FormRepo:              formRepo,
		AccessStatRepo:        accessStatRepo,
		Minio:                 minioClient,
		BaseURL:               cfg.BaseURL,
	}

	// Form handler
	formHandler := &handler.FormHandler{
		FormRepo:           formRepo,
		FormSubmissionRepo: formSubmissionRepo,
		UrldynRepo:         urldynRepo,
		ArticleRepo:        articleRepo,
		AccessStatRepo:     accessStatRepo,
		BaseURL:            cfg.BaseURL,
	}

	// Public article handler
	publicArticleHandler := &handler.PublicArticleHandler{
		ArticleRepo:           articleRepo,
		ArticleAttachmentRepo: articleAttachmentRepo,
		AccessStatRepo:        accessStatRepo,
		Minio:                 minioClient,
	}

	// Public form handler
	publicFormHandler := &handler.PublicFormHandler{
		FormRepo:           formRepo,
		FormSubmissionRepo: formSubmissionRepo,
		AccessStatRepo:     accessStatRepo,
	}

	// Upload handler
	uploadHandler := &handler.UploadHandler{
		Minio: minioClient,
	}

	// Codes handler
	codesHandler := &handler.CodesHandler{
		UrldynRepo:     urldynRepo,
		ArticleRepo:    articleRepo,
		FormRepo:       formRepo,
		AccessStatRepo: accessStatRepo,
		BaseURL:        cfg.BaseURL,
	}

	// Redirect handler
	redirectHandler := &handler.RedirectHandler{
		UrldynRepo:     urldynRepo,
		ArticleRepo:    articleRepo,
		FormRepo:       formRepo,
		AccessStatRepo: accessStatRepo,
		BaseURL:        cfg.BaseURL,
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

	// Urldyn routes (protected)
	urldynGroup := api.Group("/urldyn").Use(middleware.Auth(cfg.JWTSecret))
	{
		urldynGroup.POST("", urldynHandler.Create)
		urldynGroup.GET("", urldynHandler.List)
		urldynGroup.GET("/:id", urldynHandler.Detail)
		urldynGroup.PUT("/:id", urldynHandler.Update)
		urldynGroup.DELETE("/:id", urldynHandler.Delete)
	}

	// Article routes (protected)
	articleGroup := api.Group("/article").Use(middleware.Auth(cfg.JWTSecret))
	{
		articleGroup.POST("", articleHandler.Create)
		articleGroup.GET("", articleHandler.List)
		articleGroup.GET("/:id", articleHandler.Detail)
		articleGroup.PUT("/:id", articleHandler.Update)
		articleGroup.DELETE("/:id", articleHandler.Delete)
	}

	// Form routes (protected)
	formGroup := api.Group("/form").Use(middleware.Auth(cfg.JWTSecret))
	{
		formGroup.POST("", formHandler.Create)
		formGroup.GET("", formHandler.List)
		formGroup.GET("/:id", formHandler.Detail)
		formGroup.PUT("/:id", formHandler.Update)
		formGroup.DELETE("/:id", formHandler.Delete)
		formGroup.GET("/:id/submissions", formHandler.Submissions)
		formGroup.GET("/:id/submissions/export", formHandler.Export)
	}

	// Upload routes (protected)
	api.POST("/upload", middleware.Auth(cfg.JWTSecret), uploadHandler.Upload)

	// File proxy routes
	api.GET("/files/*key", uploadHandler.ServeFile)

	// Public article and form routes
	api.GET("/public/article/:code", publicArticleHandler.GetArticle)
	api.GET("/public/form/:code", publicFormHandler.GetForm)
	api.POST("/public/form/:code/submit", publicFormHandler.Submit)

	// Codes routes (protected)
	api.GET("/codes", middleware.Auth(cfg.JWTSecret), codesHandler.List)

	// Public short-link redirects
	r.GET("/u/:code", redirectHandler.RedirectURL)
	r.GET("/a/:code", redirectHandler.RedirectArticle)
	r.GET("/f/:code", redirectHandler.RedirectForm)

	api.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	slog.Info("server starting", "port", 8080)
	if err := r.Run(":8080"); err != nil {
		slog.Error("server failed", "error", err)
		os.Exit(1)
	}
}
