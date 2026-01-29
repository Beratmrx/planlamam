# Proje Taşıma Script'i
Write-Host "=== Proje Taşıma Başlıyor ===" -ForegroundColor Cyan
Write-Host ""

$kaynak = "C:\Users\fatih\OneDrive\Desktop\yapılacaklar - Kopya (3)"
$hedef = "C:\Projects\yapilacaklar"

# 1. Hedef klasörü oluştur
Write-Host "1/5 Hedef klasör oluşturuluyor..." -ForegroundColor Yellow
New-Item -Path "C:\Projects" -ItemType Directory -Force -ErrorAction SilentlyContinue | Out-Null

# 2. Dosyaları kopyala
Write-Host "2/5 Dosyalar kopyalanıyor... (Bu 2-3 dakika sürebilir)" -ForegroundColor Yellow
Copy-Item -Path $kaynak -Destination $hedef -Recurse -Force

# 3. node_modules temizle
Write-Host "3/5 node_modules temizleniyor..." -ForegroundColor Yellow
Remove-Item -Path "$hedef\node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$hedef\backend\node_modules" -Recurse -Force -ErrorAction SilentlyContinue

# 4. WhatsApp session temizle
Write-Host "4/5 WhatsApp session temizleniyor..." -ForegroundColor Yellow
Remove-Item -Path "$hedef\backend\.wwebjs_auth" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$hedef\backend\.wwebjs_cache" -Recurse -Force -ErrorAction SilentlyContinue

# 5. Paketleri yükle
Write-Host "5/5 npm paketleri yükleniyor..." -ForegroundColor Yellow
Write-Host "  -> Ana klasör paketleri..." -ForegroundColor Gray
Set-Location $hedef
npm install --silent

Write-Host "  -> Backend paketleri..." -ForegroundColor Gray
Set-Location "$hedef\backend"
npm install --silent

Write-Host ""
Write-Host "=== ✅ Taşıma Tamamlandı! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Yeni konum: $hedef" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend başlatmak için:" -ForegroundColor Yellow
Write-Host "  cd `"$hedef\backend`"" -ForegroundColor White
Write-Host "  npm start" -ForegroundColor White
Write-Host ""
Write-Host "Frontend başlatmak için:" -ForegroundColor Yellow
Write-Host "  cd `"$hedef`"" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White
