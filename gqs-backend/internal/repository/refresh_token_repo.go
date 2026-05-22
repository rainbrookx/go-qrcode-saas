package repository

import (
	"github.com/rainbrookx/go-qrcode-saas/internal/model"
	"gorm.io/gorm"
)

type RefreshTokenRepo struct {
	DB *gorm.DB
}

func NewRefreshTokenRepo(db *gorm.DB) *RefreshTokenRepo {
	return &RefreshTokenRepo{DB: db}
}

func (r *RefreshTokenRepo) Create(token *model.RefreshToken) error {
	return r.DB.Create(token).Error
}

func (r *RefreshTokenRepo) FindValidByTokenID(tokenID string) (*model.RefreshToken, error) {
	var token model.RefreshToken
	err := r.DB.Where("token_id = ? AND invalidated = ?", tokenID, false).First(&token).Error
	if err != nil {
		return nil, err
	}
	return &token, nil
}

func (r *RefreshTokenRepo) InvalidateByTokenID(tokenID string) error {
	return r.DB.Model(&model.RefreshToken{}).
		Where("token_id = ?", tokenID).
		Update("invalidated", true).Error
}

func (r *RefreshTokenRepo) InvalidateAllForUser(userID uint64) error {
	return r.DB.Model(&model.RefreshToken{}).
		Where("user_id = ? AND invalidated = ?", userID, false).
		Update("invalidated", true).Error
}
