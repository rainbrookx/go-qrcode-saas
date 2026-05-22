package handler

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"net/http"
	"regexp"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/rainbrookx/go-qrcode-saas/internal/auth"
	"github.com/rainbrookx/go-qrcode-saas/internal/model"
	"github.com/rainbrookx/go-qrcode-saas/internal/repository"
	"github.com/rainbrookx/go-qrcode-saas/internal/response"
)

type AuthHandler struct {
	UserRepo        *repository.UserRepo
	RefreshTokenRepo *repository.RefreshTokenRepo
	EmailCodeRepo   *repository.EmailCodeRepo
	JWTSecret       string
	Mailer          *auth.Mailer
}

var passwordRule = regexp.MustCompile(`^[a-zA-Z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,64}$`)

func (h *AuthHandler) Register(c *gin.Context) {
	var req struct {
		Email           string `json:"email" binding:"required,email,max=254"`
		Password        string `json:"password" binding:"required,min=8,max=64"`
		ConfirmPassword string `json:"confirm_password" binding:"required,eqfield=Password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.CodeGeneral, "参数校验失败："+err.Error())
		return
	}
	if !hasUpperAndLowerAndDigit(req.Password) {
		response.Error(c, http.StatusBadRequest, response.CodeGeneral, "密码须包含大小写字母和数字")
		return
	}

	exists, err := h.UserRepo.ExistsByEmail(req.Email)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
		return
	}
	if exists {
		response.Error(c, http.StatusConflict, response.CodeEmailExists, "邮箱已被注册")
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
		return
	}

	user := &model.User{Email: req.Email, PasswordHash: hash}
	if err := h.UserRepo.Create(user); err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
		return
	}

	response.Created(c, nil)
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req struct {
		GrantType string `json:"grant_type" binding:"required,oneof=password email_code"`
		Email     string `json:"email" binding:"required,email"`
		Password  string `json:"password"`
		Code      string `json:"code"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.CodeGeneral, "参数校验失败")
		return
	}

	var user *model.User
	var err error

	switch req.GrantType {
	case "password":
		user, err = h.authenticateByPassword(req.Email, req.Password)
	case "email_code":
		user, err = h.authenticateByEmailCode(req.Email, req.Code)
	}
	if err != nil {
		response.Error(c, http.StatusUnauthorized, response.CodeAuthWrong, err.Error())
		return
	}

	h.issueTokens(c, user)
}

func (h *AuthHandler) authenticateByPassword(email, password string) (*model.User, error) {
	user, err := h.UserRepo.FindByEmail(email)
	if err != nil {
		return nil, fmt.Errorf("邮箱或密码错误")
	}
	if !auth.CheckPassword(password, user.PasswordHash) {
		return nil, fmt.Errorf("邮箱或密码错误")
	}
	return user, nil
}

func (h *AuthHandler) authenticateByEmailCode(email, code string) (*model.User, error) {
	record, err := h.EmailCodeRepo.FindValid(email, code, "login")
	if err != nil {
		return nil, fmt.Errorf("验证码错误或已过期")
	}
	_ = h.EmailCodeRepo.MarkUsed(record.ID)

	user, err := h.UserRepo.FindByEmail(email)
	if err != nil {
		return nil, fmt.Errorf("账号不存在")
	}
	return user, nil
}

func (h *AuthHandler) SendVerifyCode(c *gin.Context) {
	var req struct {
		Email   string `json:"email" binding:"required,email"`
		Purpose string `json:"purpose" binding:"required,oneof=login reset_password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.CodeGeneral, "参数校验失败")
		return
	}

	// Check email exists for login code
	if req.Purpose == "login" {
		exists, err := h.UserRepo.ExistsByEmail(req.Email)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
			return
		}
		if !exists {
			response.Error(c, http.StatusNotFound, response.CodeEmailNotReg, "邮箱未注册")
			return
		}
	}

	// Check email exists for reset_password
	if req.Purpose == "reset_password" {
		exists, err := h.UserRepo.ExistsByEmail(req.Email)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
			return
		}
		if !exists {
			response.Error(c, http.StatusNotFound, response.CodeEmailNotReg2, "邮箱未注册")
			return
		}
	}

	// Rate limit: 60s per email
	lastSend, err := h.EmailCodeRepo.LastSendTime(req.Email)
	if err == nil && time.Since(lastSend) < 60*time.Second {
		response.Error(c, http.StatusTooManyRequests, response.CodeSendFrequent, "发送过于频繁，请 60 秒后重试")
		return
	}

	code := generateCode()
	record := &model.EmailVerifyCode{
		Email:     req.Email,
		Code:      code,
		Purpose:   req.Purpose,
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}
	if err := h.EmailCodeRepo.Create(record); err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
		return
	}

	_ = h.Mailer.SendVerificationCode(req.Email, code, req.Purpose)
	response.Success(c, nil)
}

func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req struct {
		Email           string `json:"email" binding:"required,email"`
		Code            string `json:"code" binding:"required,len=6"`
		NewPassword     string `json:"new_password" binding:"required,min=8,max=64"`
		ConfirmPassword string `json:"confirm_password" binding:"required,eqfield=NewPassword"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.CodeGeneral, "参数校验失败")
		return
	}
	if !hasUpperAndLowerAndDigit(req.NewPassword) {
		response.Error(c, http.StatusBadRequest, response.CodeGeneral, "密码须包含大小写字母和数字")
		return
	}

	// Validate code
	record, err := h.EmailCodeRepo.FindValid(req.Email, req.Code, "reset_password")
	if err != nil {
		response.Error(c, http.StatusBadRequest, response.CodeVerifyWrong, "验证码错误或已过期")
		return
	}
	_ = h.EmailCodeRepo.MarkUsed(record.ID)

	user, err := h.UserRepo.FindByEmail(req.Email)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
		return
	}

	hash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
		return
	}

	if err := h.UserRepo.UpdatePassword(user.ID, hash); err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
		return
	}

	response.Success(c, nil)
}

func (h *AuthHandler) ChangePassword(c *gin.Context) {
	userID := c.GetUint64("user_id")

	var req struct {
		OldPassword     string `json:"old_password" binding:"required"`
		NewPassword     string `json:"new_password" binding:"required,min=8,max=64"`
		ConfirmPassword string `json:"confirm_password" binding:"required,eqfield=NewPassword"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.CodeGeneral, "参数校验失败")
		return
	}
	if !hasUpperAndLowerAndDigit(req.NewPassword) {
		response.Error(c, http.StatusBadRequest, response.CodeGeneral, "密码须包含大小写字母和数字")
		return
	}
	if req.OldPassword == req.NewPassword {
		response.Error(c, http.StatusBadRequest, response.CodeSamePassword, "新密码与旧密码相同")
		return
	}

	user, err := h.UserRepo.FindByID(userID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
		return
	}
	if !auth.CheckPassword(req.OldPassword, user.PasswordHash) {
		response.Error(c, http.StatusBadRequest, response.CodeOldPassWrong, "旧密码错误")
		return
	}

	hash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
		return
	}
	if err := h.UserRepo.UpdatePassword(userID, hash); err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
		return
	}

	response.Success(c, nil)
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.CodeGeneral, "参数校验失败")
		return
	}

	claims, err := auth.ParseToken(h.JWTSecret, req.RefreshToken)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, response.CodeRefreshInvalid, "Refresh Token 无效或已过期，需重新登录")
		return
	}

	// Check token exists and not invalidated
	tokenRecord, err := h.RefreshTokenRepo.FindValidByTokenID(claims.JTI)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, response.CodeRefreshInvalid, "Refresh Token 无效或已过期，需重新登录")
		return
	}

	// Check not expired
	if time.Now().After(tokenRecord.ExpiresAt) {
		response.Error(c, http.StatusUnauthorized, response.CodeRefreshInvalid, "Refresh Token 无效或已过期，需重新登录")
		return
	}

	// Invalidate old token
	_ = h.RefreshTokenRepo.InvalidateByTokenID(claims.JTI)

	// Issue new pair
	accessToken, _, err := auth.GenerateAccessToken(h.JWTSecret, claims.UserID, claims.Email)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
		return
	}

	refreshToken, jti, exp, err := auth.GenerateRefreshToken(h.JWTSecret, claims.UserID, claims.Email)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
		return
	}

	newRecord := &model.RefreshToken{
		UserID:    claims.UserID,
		TokenID:   jti,
		ExpiresAt: exp,
	}
	_ = h.RefreshTokenRepo.Create(newRecord)

	response.Success(c, gin.H{
		"access_token":       accessToken,
		"refresh_token":      refreshToken,
		"expires_in":         int(auth.AccessTokenTTL.Seconds()),
		"refresh_expires_in": int(auth.RefreshTokenTTL.Seconds()),
	})
}

func (h *AuthHandler) Me(c *gin.Context) {
	userID := c.GetUint64("user_id")

	user, err := h.UserRepo.FindByID(userID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
		return
	}

	response.Success(c, gin.H{
		"id":         user.ID,
		"email":      user.Email,
		"created_at": user.CreatedAt,
	})
}

func (h *AuthHandler) Quota(c *gin.Context) {
	userID := c.GetUint64("user_id")

	_, _ = h.UserRepo.FindByID(userID)

	// TODO: count from urldyn + article + form tables, will wire in later phases
	response.Success(c, gin.H{
		"total":     100,
		"used":      0,
		"remaining": 100,
		"breakdown": gin.H{
			"urldyn":  0,
			"article": 0,
			"form":    0,
		},
	})
}

func (h *AuthHandler) issueTokens(c *gin.Context, user *model.User) {
	accessToken, _, err := auth.GenerateAccessToken(h.JWTSecret, user.ID, user.Email)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
		return
	}

	refreshToken, jti, exp, err := auth.GenerateRefreshToken(h.JWTSecret, user.ID, user.Email)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
		return
	}

	record := &model.RefreshToken{
		UserID:    user.ID,
		TokenID:   jti,
		ExpiresAt: exp,
	}
	if err := h.RefreshTokenRepo.Create(record); err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeServerError, "服务器错误")
		return
	}

	response.Success(c, gin.H{
		"access_token":       accessToken,
		"refresh_token":      refreshToken,
		"expires_in":         int(auth.AccessTokenTTL.Seconds()),
		"refresh_expires_in": int(auth.RefreshTokenTTL.Seconds()),
		"user": gin.H{
			"id":         user.ID,
			"email":      user.Email,
		},
	})
}

func hasUpperAndLowerAndDigit(s string) bool {
	hasUpper := false
	hasLower := false
	hasDigit := false
	for _, r := range s {
		if r >= 'A' && r <= 'Z' {
			hasUpper = true
		}
		if r >= 'a' && r <= 'z' {
			hasLower = true
		}
		if r >= '0' && r <= '9' {
			hasDigit = true
		}
	}
	return hasUpper && hasLower && hasDigit
}

func generateCode() string {
	const digits = "0123456789"
	code := make([]byte, 6)
	for i := range code {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(digits))))
		code[i] = digits[n.Int64()]
	}
	return string(code)
}
