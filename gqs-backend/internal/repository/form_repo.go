package repository

import (
	"time"

	"github.com/rainbrookx/go-qrcode-saas/internal/model"
	"gorm.io/gorm"
)

type FormRepo struct {
	DB *gorm.DB
}

func NewFormRepo(db *gorm.DB) *FormRepo {
	return &FormRepo{DB: db}
}

func (r *FormRepo) FindByCode(c string) (*model.Form, error) {
	var form model.Form
	err := r.DB.Where("code = ?", c).First(&form).Error
	if err != nil {
		return nil, err
	}
	return &form, nil
}

func (r *FormRepo) CountActiveByUser(userID uint64) (int64, error) {
	var count int64
	err := r.DB.Model(&model.Form{}).
		Where("user_id = ? AND expires_at > ?", userID, time.Now()).
		Count(&count).Error
	return count, err
}
