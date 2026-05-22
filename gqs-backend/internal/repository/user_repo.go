package repository

import (
	"github.com/rainbrookx/go-qrcode-saas/internal/model"
	"gorm.io/gorm"
)

type UserRepo struct {
	DB *gorm.DB
}

func NewUserRepo(db *gorm.DB) *UserRepo {
	return &UserRepo{DB: db}
}

func (r *UserRepo) Create(user *model.User) error {
	return r.DB.Create(user).Error
}

func (r *UserRepo) FindByEmail(email string) (*model.User, error) {
	var user model.User
	err := r.DB.Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepo) FindByID(id uint64) (*model.User, error) {
	var user model.User
	err := r.DB.First(&user, id).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepo) UpdatePassword(id uint64, hash string) error {
	return r.DB.Model(&model.User{}).Where("id = ?", id).Update("password_hash", hash).Error
}

func (r *UserRepo) ExistsByEmail(email string) (bool, error) {
	var count int64
	err := r.DB.Model(&model.User{}).Where("email = ?", email).Count(&count).Error
	return count > 0, err
}
