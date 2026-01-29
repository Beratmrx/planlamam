Write-Host "=== WhatsApp Logout API Testi ===" -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/whatsapp/logout" -Method POST -ContentType "application/json"
    
    Write-Host "✅ API Başarılı!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Yanıt:" -ForegroundColor Yellow
    Write-Host "  Success: $($response.success)" -ForegroundColor White
    Write-Host "  Message: $($response.message)" -ForegroundColor White
    
} catch {
    Write-Host "❌ API Hatası!" -ForegroundColor Red
    Write-Host "  Hata: $($_.Exception.Message)" -ForegroundColor White
}

Write-Host ""
Write-Host "=== Test Tamamlandı ===" -ForegroundColor Cyan
