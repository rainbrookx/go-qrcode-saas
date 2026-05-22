package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/rainbrookx/go-qrcode-saas/internal/auth"
	"github.com/rainbrookx/go-qrcode-saas/internal/response"
)

func Auth(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			response.Error(c, http.StatusUnauthorized, 40100, "未提供认证令牌")
			return
		}

		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			response.Error(c, http.StatusUnauthorized, 40100, "认证格式错误")
			return
		}

		claims, err := auth.ParseToken(jwtSecret, parts[1])
		if err != nil {
			response.Error(c, http.StatusUnauthorized, 40100, "令牌无效或已过期")
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("email", claims.Email)
		c.Next()
	}
}
