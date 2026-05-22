package repository

import (
	"github.com/rainbrookx/go-qrcode-saas/internal/model"
	"gorm.io/gorm"
)

type ArticleAttachmentRepo struct {
	DB *gorm.DB
}

func NewArticleAttachmentRepo(db *gorm.DB) *ArticleAttachmentRepo {
	return &ArticleAttachmentRepo{DB: db}
}

func (r *ArticleAttachmentRepo) Create(att *model.ArticleAttachment) error {
	return r.DB.Create(att).Error
}

func (r *ArticleAttachmentRepo) CreateBatch(atts []model.ArticleAttachment) error {
	if len(atts) == 0 {
		return nil
	}
	return r.DB.Create(&atts).Error
}

func (r *ArticleAttachmentRepo) FindByArticleID(articleID uint64) ([]model.ArticleAttachment, error) {
	var atts []model.ArticleAttachment
	err := r.DB.Where("article_id = ?", articleID).Find(&atts).Error
	return atts, err
}

func (r *ArticleAttachmentRepo) DeleteByArticleID(articleID uint64) error {
	return r.DB.Where("article_id = ?", articleID).Delete(&model.ArticleAttachment{}).Error
}

func (r *ArticleAttachmentRepo) DeleteByIDs(ids []uint64) error {
	if len(ids) == 0 {
		return nil
	}
	return r.DB.Where("id IN ?", ids).Delete(&model.ArticleAttachment{}).Error
}
