@echo off
REM ============================================================
REM sync-portable.bat
REM Copia os 5 arquivos de codigo do projeto dev (D:\Project)
REM para o build portatil (D:\MeuBolsoPortable\resources\app).
REM Use apos alterar main.js / preload.js / app.js / index.html / styles.css
REM no dev, para manter o executavel portatil em dia.
REM Mantem um backup dos arquivos antigos do portable antes de sobrescrever.
REM ============================================================
set DEV=D:\Project
set PORT=D:\MeuBolsoPortable\resources\app
set STAMP=%DATE:~6,4%%DATE:~3,2%%DATE:~0,2%-%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%
set STAMP=%STAMP: =0%
set BAK=%PORT%\_BAK_%STAMP%

if not exist "%PORT%" (
  echo [ERRO] Pasta do build portatil nao encontrada: %PORT%
  exit /b 1
)

echo [1/3] Criando backup do portable em: %BAK%
mkdir "%BAK%" 2>nul
copy /Y "%PORT%\main.js"     "%BAK%\main.js"     >nul
copy /Y "%PORT%\preload.js"  "%BAK%\preload.js"  >nul
copy /Y "%PORT%\app.js"      "%BAK%\app.js"      >nul
copy /Y "%PORT%\index.html"  "%BAK%\index.html"  >nul
copy /Y "%PORT%\styles.css"  "%BAK%\styles.css"  >nul

echo [2/3] Copiando arquivos do dev para o portable...
copy /Y "%DEV%\main.js"     "%PORT%\main.js"     || exit /b 1
copy /Y "%DEV%\preload.js"  "%PORT%\preload.js"  || exit /b 1
copy /Y "%DEV%\app.js"      "%PORT%\app.js"      || exit /b 1
copy /Y "%DEV%\index.html"  "%PORT%\index.html"  || exit /b 1
copy /Y "%DEV%\styles.css"  "%PORT%\styles.css"  || exit /b 1

echo [3/3] Verificando sincronizacao...
fc /B "%DEV%\main.js"     "%PORT%\main.js"     >nul && echo   main.js     OK || echo   main.js     DIFERE
fc /B "%DEV%\preload.js"  "%PORT%\preload.js"  >nul && echo   preload.js  OK || echo   preload.js  DIFERE
fc /B "%DEV%\app.js"      "%PORT%\app.js"      >nul && echo   app.js      OK || echo   app.js      DIFERE
fc /B "%DEV%\index.html"  "%PORT%\index.html"  >nul && echo   index.html  OK || echo   index.html  DIFERE
fc /B "%DEV%\styles.css"  "%PORT%\styles.css"  >nul && echo   styles.css  OK || echo   styles.css  DIFERE

echo.
echo Pronto. Build portatil sincronizado com o dev.
