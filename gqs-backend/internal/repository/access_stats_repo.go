package repository

import (
	"time"

	"github.com/rainbrookx/go-qrcode-saas/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type AccessStatRepo struct {
	DB *gorm.DB
}

func NewAccessStatRepo(db *gorm.DB) *AccessStatRepo {
	return &AccessStatRepo{DB: db}
}

func (r *AccessStatRepo) Increment(codeType string, codeID uint64) error {
	today := time.Now().Truncate(24 * time.Hour)
	stat := model.AccessStat{
		CodeType:    codeType,
		CodeID:      codeID,
		AccessDate:  today,
		AccessCount: 1,
	}
	return r.DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "code_type"}, {Name: "code_id"}, {Name: "access_date"}},
		DoUpdates: clause.Assignments(map[string]interface{}{"access_count": gorm.Expr("access_count + 1")}),
	}).Create(&stat).Error
}

func (r *AccessStatRepo) DailyStats(codeType string, codeID uint64, days int) ([]map[string]interface{}, error) {
	since := time.Now().AddDate(0, 0, -days)
	var stats []map[string]interface{}
	err := r.DB.Model(&model.AccessStat{}).
		Select("access_date as date, access_count as count").
		Where("code_type = ? AND code_id = ? AND access_date >= ?", codeType, codeID, since).
		Order("access_date ASC").
		Find(&stats).Error
	return stats, err
}

func (r *AccessStatRepo) TotalCount(codeType string, codeID uint64) (int64, error) {
	var total int64
	err := r.DB.Model(&model.AccessStat{}).
		Where("code_type = ? AND code_id = ?", codeType, codeID).
		Select("COALESCE(SUM(access_count), 0)").
		Scan(&total).Error
	return total, err
}
