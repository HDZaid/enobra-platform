param(
    [string]$BaseUrl = 'http://127.0.0.1:8000/api/v1',
    [System.Management.Automation.PSCredential]$Credential
)

$ErrorActionPreference = 'Stop'
$BaseUrl = $BaseUrl.TrimEnd('/')
if (-not $Credential) {
    $Credential = Get-Credential -Message 'Correo y contrasena de una cuenta administradora existente'
}
if (-not $Credential) { throw 'Se necesita una cuenta administradora.' }

function Request-Api {
    param([string]$Method, [string]$Path, $Body, [string]$Token, [int[]]$Expected = @(200))
    $parameters = @{ Uri = "$BaseUrl/$Path"; Method = $Method; UseBasicParsing = $true }
    if ($Token) { $parameters.Headers = @{ Authorization = "Bearer $Token" } }
    if ($null -ne $Body) {
        $parameters.ContentType = 'application/json; charset=utf-8'
        $parameters.Body = [System.Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json -Depth 10))
    }
    $content = $null
    try {
        $reply = Invoke-WebRequest @parameters
        $code = [int]$reply.StatusCode
        if ($reply.Content) { $content = $reply.Content | ConvertFrom-Json }
    } catch {
        if (-not $_.Exception.Response) { throw }
        $code = [int]$_.Exception.Response.StatusCode
        if ($Expected -notcontains $code) { throw }
    }
    if ($Expected -notcontains $code) { throw "$Method $Path devolvio $code; esperado: $Expected" }
    Write-Host "OK  $Method $Path -> $code" -ForegroundColor Green
    return $content
}

$session = Request-Api -Method POST -Path 'auth/login/' -Body @{
    email = $Credential.UserName; password = $Credential.GetNetworkCredential().Password
}
$access = $session.access
$created = [System.Collections.Generic.List[string]]::new()
$suffix = [guid]::NewGuid().ToString('N').Substring(0, 10)
$today = Get-Date -Format 'yyyy-MM-dd'
$image = 'https://example.com/imagen-de-prueba.jpg'

try {
    $me = Request-Api -Method GET -Path 'auth/me/' -Token $access
    Write-Host "Sesion: $($me.name), rol: $($me.role)"
    foreach ($kind in @('projects', 'properties', 'news')) {
        $body = @{
            title = "PRUEBA API $suffix $kind"; description = 'Registro temporal para revision del backend'
            published = $false; demo = $true
        }
        switch ($kind) {
            'projects' {
                $body += @{ category = 'Vivienda'; country = 'Guatemala'; year = [int](Get-Date -Format yyyy)
                    images = @($image); renders = @(); video = 'https://youtu.be/dQw4w9WgXcQ' }
            }
            'properties' {
                $body += @{ operation = 'Venta'; type = 'Casa'; zone = 'Zona 9'; location = 'Quetzaltenango'
                    price = 500000; area = 150; rooms = 3; baths = 2; parking = 1; date = $today
                    commercial = 'Solo prueba'; images = @($image); renders = @(); video = '' }
            }
            'news' { $body += @{ category = 'Eventos'; date = $today; image = $image } }
        }
        $item = Request-Api -Method POST -Path "$kind/" -Token $access -Body $body -Expected @(201)
        $path = "$kind/$($item.id)/"
        $created.Add($path)
        Write-Host "Creado borrador: $($item.id)"
        $null = Request-Api -Method GET -Path $path -Token $access
        $null = Request-Api -Method GET -Path $path -Expected @(404)
        $null = Request-Api -Method PATCH -Path $path -Body @{title = 'Cambio sin permiso'} -Expected @(401)
        $edited = Request-Api -Method PATCH -Path $path -Token $access -Body @{title = "PRUEBA editada $suffix"}
        if ($edited.title -ne "PRUEBA editada $suffix") { throw 'No se guardo el titulo editado.' }
        $null = Request-Api -Method GET -Path "$kind/?page_size=1" -Token $access
    }
    $null = Request-Api -Method GET -Path 'inquiries/' -Expected @(401)
    $null = Request-Api -Method GET -Path 'company/' -Token $access
    $null = Request-Api -Method GET -Path 'institution/' -Token $access
    $renewed = Request-Api -Method POST -Path 'auth/refresh/' -Body @{refresh = $session.refresh}
    $null = Request-Api -Method GET -Path 'auth/me/' -Token $renewed.access
} finally {
    # Se eliminan exclusivamente los IDs devueltos por las altas de esta ejecucion.
    foreach ($path in $created) {
        try {
            $null = Request-Api -Method DELETE -Path $path -Token $access -Expected @(204, 404)
            $null = Request-Api -Method GET -Path $path -Token $access -Expected @(404)
        } catch {
            Write-Warning "No se pudo limpiar $path. Eliminalo con tu cuenta administradora. $($_.Exception.Message)"
        }
    }
    $null = Request-Api -Method POST -Path 'auth/logout/' -Body @{refresh = $session.refresh} -Expected @(204)
}
$null = Request-Api -Method GET -Path 'auth/me/' -Token $access -Expected @(401)
$null = Request-Api -Method POST -Path 'auth/refresh/' -Body @{refresh = $session.refresh} -Expected @(401)
Write-Host 'Prueba terminada. Revisa los OK anteriores y cualquier aviso de limpieza.' -ForegroundColor Cyan
