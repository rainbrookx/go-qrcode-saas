package repository

import (
	"time"

	"github.com/rainbrookx/go-qrcode-saas/internal/model"
	"gorm.io/gorm"
)

type ArticleRepo struct {
	DB *gorm.DB
}

func NewArticleRepo(db *gorm.DB) *ArticleRepo {
	return &ArticleRepo{DB: db}
}

func (r *ArticleRepo) Create(article *model.Article) error {
	return r.DB.Create(article).Error
}

func (r *ArticleRepo) FindByID(id, userID uint64) (*model.Article, error) {
	var article model.Article
	err := r.DB.Where("id = ? AND user_id = ?", id, userID).First(&article).Error
	if err != nil {
		return nil, err
	}
	return &article, nil
}

func (r *ArticleRepo) FindByCode(c string) (*model.Article, error) {
	var article model.Article
	err := r.DB.Where("code = ?", c).First(&article).Error
	if err != nil {
		return nil, err
	}
	return &article, nil
}

func (r *ArticleRepo) ListByUser(userID uint64, status string, page, pageSize int) ([]model.Article, int64, error) {
	var list []model.Article
	var total int64
	query := r.DB.Model(&model.Article{}).Where("user_id = ?", userID)
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

func (r *ArticleRepo) Update(article *model.Article) error {
	return r.DB.Save(article).Error
}

func (r *ArticleRepo) Delete(id, userID uint64) error {
	return r.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&model.Article{}).Error
}

func (r *ArticleRepo) CodeExists(code string) (bool, error) {
	var count int64
	err := r.DB.Model(&model.Article{}).Where("code = ?", code).Count(&count).Error
	return count > 0, err
}

func (r *ArticleRepo) CountActiveByUser(userID uint64) (int64, error) {
	var count int64
	err := r.DB.Model(&model.Article{}).
		Where("user_id = ? AND expires_at > ?", userID, time.Now()).
		Count(&count).Error
	return count, err
}
