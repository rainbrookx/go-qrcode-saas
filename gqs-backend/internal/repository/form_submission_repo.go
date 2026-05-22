package repository

import (
	"time"

	"github.com/rainbrookx/go-qrcode-saas/internal/model"
	"gorm.io/gorm"
)

type FormSubmissionRepo struct {
	DB *gorm.DB
}

func NewFormSubmissionRepo(db *gorm.DB) *FormSubmissionRepo {
	return &FormSubmissionRepo{DB: db}
}

func (r *FormSubmissionRepo) Create(sub *model.FormSubmission) error {
	return r.DB.Create(sub).Error
}

func (r *FormSubmissionRepo) CountByFormID(formID uint64) (int64, error) {
	var count int64
	err := r.DB.Model(&model.FormSubmission{}).Where("form_id = ?", formID).Count(&count).Error
	return count, err
}

func (r *FormSubmissionRepo) ListByFormID(formID uint64, page, pageSize int) ([]model.FormSubmission, int64, error) {
	var list []model.FormSubmission
	var total int64
	if err := r.DB.Model(&model.FormSubmission{}).Where("form_id = ?", formID).Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * pageSize
	err := r.DB.Where("form_id = ?", formID).
		Order("submitted_at DESC").
		Offset(offset).Limit(pageSize).
		Find(&list).Error
	return list, total, err
}

func (r *FormSubmissionRepo) LastSubmissionTime(ip string) (time.Time, error) {
	var sub model.FormSubmission
	err := r.DB.Where("ip_address = ?", ip).Order("submitted_at DESC").First(&sub).Error
	if err != nil {
		return time.Time{}, err
	}
	return sub.SubmittedAt, nil
}

func (r *FormSubmissionRepo) AllByFormID(formID uint64) ([]model.FormSubmission, error) {
	var list []model.FormSubmission
	err := r.DB.Where("form_id = ?", formID).Order("submitted_at ASC").Find(&list).Error
	return list, err
}

func (r *FormSubmissionRepo) DeleteByFormID(formID uint64) error {
	return r.DB.Where("form_id = ?", formID).Delete(&model.FormSubmission{}).Error
}
