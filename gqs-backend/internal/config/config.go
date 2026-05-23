package config

import (
	"github.com/spf13/viper"
)

type Config struct {
	DBDsn         string
	JWTSecret     string
	MinioEndpoint string
	MinioAccess   string
	MinioSecret   string
	MinioBucket   string
	SMTPEnabled   bool
	SMTPHost      string
	SMTPPort      string
	SMTPUser      string
	SMTPPass      string
	SMTPFrom      string
	BaseURL       string
}

func Load() *Config {
	viper.SetConfigFile(".env")
	viper.AutomaticEnv()

	_ = viper.ReadInConfig()

	viper.SetDefault("DB_DSN", "root:password@tcp(127.0.0.1:3306)/db_go_qrcode_saas?charset=utf8mb4&parseTime=True&loc=Local")
	viper.SetDefault("JWT_SECRET", "change-me-in-production")
	viper.SetDefault("MINIO_ENDPOINT", "127.0.0.1:9000")
	viper.SetDefault("MINIO_BUCKET", "qrcode-saas")
	viper.SetDefault("SMTP_ENABLED", true)
	viper.SetDefault("SMTP_PORT", "587")
	viper.SetDefault("BASE_URL", "http://localhost:3000")

	return &Config{
		DBDsn:         viper.GetString("DB_DSN"),
		JWTSecret:     viper.GetString("JWT_SECRET"),
		MinioEndpoint: viper.GetString("MINIO_ENDPOINT"),
		MinioAccess:   viper.GetString("MINIO_ACCESS_KEY"),
		MinioSecret:   viper.GetString("MINIO_SECRET_KEY"),
		MinioBucket:   viper.GetString("MINIO_BUCKET"),
		SMTPEnabled:   viper.GetBool("SMTP_ENABLED"),
		SMTPHost:      viper.GetString("SMTP_HOST"),
		SMTPPort:      viper.GetString("SMTP_PORT"),
		SMTPUser:      viper.GetString("SMTP_USER"),
		SMTPPass:      viper.GetString("SMTP_PASS"),
		SMTPFrom:      viper.GetString("SMTP_FROM"),
		BaseURL:       viper.GetString("BASE_URL"),
	}
}