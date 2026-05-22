package model

import "time"

type ArticleAttachment struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	ArticleID uint64    `gorm:"not null;index:idx_article_id" json:"article_id"`
	FileKey   string    `gorm:"not null;size:512" json:"file_key"`
	FileType  string    `gorm:"not null;size:10" json:"file_type"` // image, video, audio, file
	FileName  string    `gorm:"not null;size:255" json:"file_name"`
	FileSize  uint64    `gorm:"not null" json:"file_size"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (ArticleAttachment) TableName() string {
	return "tb_article_attachments"
}