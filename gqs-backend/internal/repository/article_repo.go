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

func (r *ArticleRepo) FindByCode(c string) (*model.Article, error) {
	var article model.Article
	err := r.DB.Where("code = ?", c).First(&article).Error
	if err != nil {
		return nil, err
	}
	return &article, nil
}

func (r *ArticleRepo) CountActiveByUser(userID uint64) (int64, error) {
	var count int64
	err := r.DB.Model(&model.Article{}).
		Where("user_id = ? AND expires_at > ?", userID, time.Now()).
		Count(&count).Error
	return count, err
}
