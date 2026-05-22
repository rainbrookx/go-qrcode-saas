package repository

import (
	"time"

	"github.com/rainbrookx/go-qrcode-saas/internal/model"
	"gorm.io/gorm"
)

type EmailCodeRepo struct {
	DB *gorm.DB
}

func NewEmailCodeRepo(db *gorm.DB) *EmailCodeRepo {
	return &EmailCodeRepo{DB: db}
}

func (r *EmailCodeRepo) Create(record *model.EmailVerifyCode) error {
	return r.DB.Create(record).Error
}

func (r *EmailCodeRepo) FindValid(email, code, purpose string) (*model.EmailVerifyCode, error) {
	var record model.EmailVerifyCode
	err := r.DB.Where(
		"email = ? AND code = ? AND purpose = ? AND used = ? AND expires_at > ?",
		email, code, purpose, false, time.Now(),
	).First(&record).Error
	if err != nil {
		return nil, err
	}
	return &record, nil
}

func (r *EmailCodeRepo) MarkUsed(id uint64) error {
	return r.DB.Model(&model.EmailVerifyCode{}).Where("id = ?", id).Update("used", true).Error
}

func (r *EmailCodeRepo) LastSendTime(email string) (time.Time, error) {
	var record model.EmailVerifyCode
	err := r.DB.Where("email = ?", email).
		Order("created_at DESC").
		First(&record).Error
	if err != nil {
		return time.Time{}, err
	}
	return record.CreatedAt, nil
}
