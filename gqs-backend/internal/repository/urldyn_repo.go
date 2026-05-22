package repository

import (
	"time"

	"github.com/rainbrookx/go-qrcode-saas/internal/model"
	"gorm.io/gorm"
)

type UrldynRepo struct {
	DB *gorm.DB
}

func NewUrldynRepo(db *gorm.DB) *UrldynRepo {
	return &UrldynRepo{DB: db}
}

func (r *UrldynRepo) Create(code *model.UrldynCode) error {
	return r.DB.Create(code).Error
}

func (r *UrldynRepo) FindByID(id, userID uint64) (*model.UrldynCode, error) {
	var code model.UrldynCode
	err := r.DB.Where("id = ? AND user_id = ?", id, userID).First(&code).Error
	if err != nil {
		return nil, err
	}
	return &code, nil
}

func (r *UrldynRepo) FindByCode(c string) (*model.UrldynCode, error) {
	var code model.UrldynCode
	err := r.DB.Where("code = ?", c).First(&code).Error
	if err != nil {
		return nil, err
	}
	return &code, nil
}

func (r *UrldynRepo) ListByUser(userID uint64, status string, page, pageSize int) ([]model.UrldynCode, int64, error) {
	var list []model.UrldynCode
	var total int64
	query := r.DB.Model(&model.UrldynCode{}).Where("user_id = ?", userID)
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

func (r *UrldynRepo) Update(code *model.UrldynCode) error {
	return r.DB.Save(code).Error
}

func (r *UrldynRepo) Delete(id, userID uint64) error {
	return r.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&model.UrldynCode{}).Error
}

func (r *UrldynRepo) CodeExists(code string) (bool, error) {
	var count int64
	err := r.DB.Model(&model.UrldynCode{}).Where("code = ?", code).Count(&count).Error
	return count > 0, err
}

func (r *UrldynRepo) CountActiveByUser(userID uint64) (int64, error) {
	var count int64
	err := r.DB.Model(&model.UrldynCode{}).
		Where("user_id = ? AND expires_at > ?", userID, time.Now()).
		Count(&count).Error
	return count, err
}
