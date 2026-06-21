# Verificador semanal de atualizações — Casa Sognatto Filmmaker
# Execute: powershell -ExecutionPolicy Bypass -File scripts\verificar-atualizacoes.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor DarkGreen
Write-Host "  CASA SOGNATTO — Verificador de Updates" -ForegroundColor DarkYellow
Write-Host "  $(Get-Date -Format 'dd/MM/yyyy HH:mm')" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor DarkGreen
Write-Host ""

Set-Location "$PSScriptRoot\.."

# ── 1. Pacotes npm desatualizados ──────────────────────────────────────────────
Write-Host "[ 1/4 ] Verificando pacotes npm..." -ForegroundColor Cyan
$npmOutdated = npm outdated --json 2>$null | ConvertFrom-Json -AsHashtable 2>$null

if ($npmOutdated -and $npmOutdated.Count -gt 0) {
    Write-Host "  ATUALIZACOES DISPONIVEIS:" -ForegroundColor Yellow
    foreach ($pkg in $npmOutdated.Keys) {
        $info = $npmOutdated[$pkg]
        Write-Host "  • $pkg" -ForegroundColor White -NoNewline
        Write-Host "  atual: $($info.current)  →  mais recente: $($info.latest)" -ForegroundColor Gray
    }
} else {
    Write-Host "  Todos os pacotes npm estao atualizados." -ForegroundColor Green
}

Write-Host ""

# ── 2. Node.js ─────────────────────────────────────────────────────────────────
Write-Host "[ 2/4 ] Verificando Node.js..." -ForegroundColor Cyan
$nodeAtual = node -v 2>$null
try {
    $nodeLatest = (Invoke-RestMethod "https://nodejs.org/dist/index.json")[0].version
    if ($nodeAtual -ne $nodeLatest) {
        Write-Host "  ATUALIZACAO DISPONIVEL:" -ForegroundColor Yellow
        Write-Host "  • Node.js  atual: $nodeAtual  →  mais recente: $nodeLatest" -ForegroundColor White
        Write-Host "    Baixe em: https://nodejs.org" -ForegroundColor Gray
    } else {
        Write-Host "  Node.js esta atualizado ($nodeAtual)." -ForegroundColor Green
    }
} catch {
    Write-Host "  Nao foi possivel verificar Node.js (sem internet?)." -ForegroundColor Gray
}

Write-Host ""

# ── 3. APIs e serviços externos ────────────────────────────────────────────────
Write-Host "[ 3/4 ] Verificando APIs externas..." -ForegroundColor Cyan

# Anthropic — verifica modelos disponíveis
try {
    $anthropicKey = (Get-Content .env.local | Where-Object { $_ -match "ANTHROPIC_API_KEY" }) -replace "ANTHROPIC_API_KEY=", ""
    $headers = @{ "x-api-key" = $anthropicKey; "anthropic-version" = "2023-06-01" }
    $models = Invoke-RestMethod "https://api.anthropic.com/v1/models" -Headers $headers
    $modelIds = $models.data | Select-Object -ExpandProperty id
    $usingModel = "claude-sonnet-4-6"
    $newerModels = $modelIds | Where-Object { $_ -gt $usingModel -and $_ -match "claude" }
    if ($newerModels) {
        Write-Host "  ANTHROPIC — Modelos mais recentes disponiveis:" -ForegroundColor Yellow
        $newerModels | ForEach-Object { Write-Host "    • $_" -ForegroundColor White }
        Write-Host "    Modelo atual em uso: $usingModel" -ForegroundColor Gray
    } else {
        Write-Host "  Anthropic: modelo $usingModel esta atualizado." -ForegroundColor Green
    }
} catch {
    Write-Host "  Anthropic: nao foi possivel verificar modelos." -ForegroundColor Gray
}

# Creatomate — verifica status da API
try {
    $creatomateKey = (Get-Content .env.local | Where-Object { $_ -match "CREATOMATE_API_KEY" }) -replace "CREATOMATE_API_KEY=", ""
    $headers = @{ "Authorization" = "Bearer $creatomateKey" }
    Invoke-RestMethod "https://api.creatomate.com/v1/renders?limit=1" -Headers $headers | Out-Null
    Write-Host "  Creatomate: API respondendo normalmente." -ForegroundColor Green
} catch {
    Write-Host "  Creatomate: ATENCAO — API nao respondeu. Verifique sua conta." -ForegroundColor Red
}

# Supabase — verifica conexão
try {
    $supabaseUrl = (Get-Content .env.local | Where-Object { $_ -match "NEXT_PUBLIC_SUPABASE_URL" }) -replace "NEXT_PUBLIC_SUPABASE_URL=", ""
    $supabaseKey = (Get-Content .env.local | Where-Object { $_ -match "NEXT_PUBLIC_SUPABASE_ANON_KEY" }) -replace "NEXT_PUBLIC_SUPABASE_ANON_KEY=", ""
    $headers = @{ "apikey" = $supabaseKey; "Authorization" = "Bearer $supabaseKey" }
    Invoke-RestMethod "$supabaseUrl/rest/v1/" -Headers $headers | Out-Null
    Write-Host "  Supabase: API respondendo normalmente." -ForegroundColor Green
} catch {
    Write-Host "  Supabase: ATENCAO — API nao respondeu. Verifique sua conta." -ForegroundColor Red
}

Write-Host ""

# ── 4. Resumo e recomendações ──────────────────────────────────────────────────
Write-Host "[ 4/4 ] Resumo de ferramentas alternativas para monitorar:" -ForegroundColor Cyan
Write-Host "  • ElevenLabs (narração em voz)   — elevenlabs.io" -ForegroundColor Gray
Write-Host "  • Runway ML (edição com IA)       — runwayml.com" -ForegroundColor Gray
Write-Host "  • Suno (música gerada por IA)     — suno.com" -ForegroundColor Gray
Write-Host "  • Whisper (legendas automáticas)  — openai.com/research/whisper" -ForegroundColor Gray

Write-Host ""
Write-Host "========================================" -ForegroundColor DarkGreen
Write-Host "  Verificacao concluida!" -ForegroundColor DarkYellow
Write-Host "  Proxima verificacao: $(((Get-Date).AddDays(7)).ToString('dd/MM/yyyy'))" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor DarkGreen
Write-Host ""
