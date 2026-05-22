package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type APIResponse struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
}

type PageData struct {
	List     interface{} `json:"list"`
	Total    int64       `json:"total"`
	Page     int         `json:"page"`
	PageSize int         `json:"page_size"`
}

func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, APIResponse{
		Code:    0,
		Message: "ok",
		Data:    data,
	})
}

func Created(c *gin.Context, data interface{}) {
	c.JSON(http.StatusCreated, APIResponse{
		Code:    0,
		Message: "ok",
		Data:    data,
	})
}

func Error(c *gin.Context, httpStatus int, code int, message string) {
	c.AbortWithStatusJSON(httpStatus, APIResponse{
		Code:    code,
		Message: message,
		Data:    nil,
	})
}

// Error codes
const (
	CodeGeneral       = 40001
	CodeAuthWrong     = 40101
	CodeVerifyWrong   = 40102
	CodeAccountNone   = 40103
	CodeSendFrequent  = 40104
	CodeEmailNotReg   = 40105
	CodeEmailNotReg2  = 40106
	CodeOldPassWrong  = 40107
	CodeSamePassword  = 40108
	CodeRefreshInvalid = 40109
	CodeRefreshReused  = 40110
	CodeEmailExists   = 40201
	CodeQuotaFull     = 40201
	CodeUrldynNotFound = 40301
	CodeUrldynExpired  = 40302
	CodeArticleNotFound = 40401
	CodeArticleExpired  = 40402
	CodeFormNotFound    = 40501
	CodeFormExpired     = 40502
	CodeFormGone        = 40503
	CodeFormStopped     = 40504
	CodeSubmitFrequent  = 40505
	CodeUploadSize      = 40601
	CodeUploadType      = 40602
	CodeUploadFail      = 40603
	CodeServerError     = 50001
)