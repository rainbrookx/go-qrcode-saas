package model

import "time"

type FormSubmission struct {
	ID          uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	FormID      uint64    `gorm:"not null;index:idx_form_id" json:"form_id"`
	Values      string    `gorm:"not null;type:json" json:"values"` // JSON string
	IPAddress   string    `gorm:"not null;size:45;index:idx_ip_address" json:"ip_address"`
	SubmittedAt time.Time `gorm:"autoCreateTime" json:"submitted_at"`
}

func (FormSubmission) TableName() string {
	return "tb_form_submissions"
}