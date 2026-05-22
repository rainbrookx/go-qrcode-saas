package model

import "time"

type AccessStat struct {
	ID          uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	CodeType    string    `gorm:"not null;size:10;uniqueIndex:uk_type_id_date" json:"code_type"` // urldyn, article, form
	CodeID      uint64    `gorm:"not null;uniqueIndex:uk_type_id_date" json:"code_id"`
	AccessDate  time.Time `gorm:"not null;type:date;uniqueIndex:uk_type_id_date" json:"access_date"`
	AccessCount uint      `gorm:"not null;default:0" json:"access_count"`
}

func (AccessStat) TableName() string {
	return "tb_access_stats"
}