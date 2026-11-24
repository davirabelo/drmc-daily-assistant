
!macro customUnInstall

  ; Só remove os dados em uma desinstalação real.
  ; Durante atualizações, preserva os dados do usuário.

  ${ifNot} ${isUpdated}

    ; Os dados do Electron ficam no perfil do usuário.
    ${if} $installMode == "all"
      SetShellVarContext current
    ${endif}

    ; Remove os diretórios de dados do aplicativo.
    RMDir /r "$APPDATA\${APP_FILENAME}"

    !ifdef APP_PRODUCT_FILENAME
      RMDir /r "$APPDATA\${APP_PRODUCT_FILENAME}"
    !endif

    !ifdef APP_PACKAGE_NAME
      RMDir /r "$APPDATA\${APP_PACKAGE_NAME}"
    !endif

    ; Remove a entrada de inicialização automática.
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "DRMc Daily Assistant"

    ${if} $installMode == "all"
      SetShellVarContext all
    ${endif}

  ${endIf}

!macroend
