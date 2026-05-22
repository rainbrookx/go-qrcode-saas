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

func (r *FormRepo) Create(form *model.Form) error {
	return r.DB.Create(form).Error
}

func (r *FormRepo) FindByID(id, userID uint64) (*model.Form, error) {
	var form model.Form
	err := r.DB.Where("id = ? AND user_id = ?", id, userID).First(&form).Error
	if err != nil {
		return nil, err
	}
	return &form, nil
}

func (r *FormRepo) FindByCode(c string) (*model.Form, error) {
	var form model.Form
	err := r.DB.Where("code = ?", c).First(&form).Error
	if err != nil {
		return nil, err
	}
	return &form, nil
}

func (r *FormRepo) ListByUser(userID uint64, status string, page, pageSize int) ([]model.Form, int64, error) {
	var list []model.Form
	var total int64
	query := r.DB.Model(&model.Form{}).Where("user_id = ?", userID)
	now := time.Now()
	switch status {
	case "active":
		query = query.Where("expires_at > ?", now)
	case "expired":
		query = query.Where("expires_at <= ?", now)
	}
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * pageSize
	err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&list).Error
	return list, total, err
}

func (r *FormRepo) Update(form *model.Form) error {
	return r.DB.Save(form).Error
}

func (r *FormRepo) Delete(id, userID uint64) error {
	return r.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&model.Form{}).Error
}

func (r *FormRepo) CodeExists(code string) (bool, error) {
	var count int64
	err := r.DB.Model(&model.Form{}).Where("code = ?", code).Count(&count).Error
	return count > 0, err
}

func (r *FormRepo) CountActiveByUser(userID uint64) (int64, error) {
	var count int64
	err := r.DB.Model(&model.Form{}).
		Where("user_id = ? AND expires_at > ?", userID, time.Now()).
		Count(&count).Error
	return count, err
}
