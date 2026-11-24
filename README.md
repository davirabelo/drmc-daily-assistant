# DRMc Daily Assistant — v0.2.0

## Novidades
- Calendário ampliado com datas comemorativas e profissionais.
- Classificação de feriados nacionais, datas locais, pontos facultativos e datas comerciais.
- Datas móveis de 2026 cadastradas com data completa.
- Exibição de múltiplas comemorações na mesma notificação.
- Datas recorrentes usam `MM-DD`; datas específicas usam `YYYY-MM-DD`.

## Instalação e teste
1. Extraia o ZIP em uma pasta nova.
2. Abra a pasta no VS Code.
3. Execute `npm install`.
4. Se o npm bloquear o script do Electron, execute `npm install-scripts approve electron` e depois `npm rebuild electron`.
5. Execute `npm start`.

## Gerar instalador
Execute `npm run dist`. O instalador será criado na pasta `dist`.

## Editar datas
Edite `data/calendario.json`.
- `date: "MM-DD"` = data recorrente anual.
- `date: "YYYY-MM-DD"` = data específica daquele ano.
- `type` = classificação exibida na notificação.

## Observações
Esta é uma agenda ampliada de datas selecionadas, não uma lista oficial exaustiva de todas as datas comemorativas existentes no Brasil. Feriados estaduais e municipais dependem da legislação local. Carnaval e Corpus Christi podem ser ponto facultativo no calendário federal e feriado em determinados municípios. Confirme a legislação local antes de definir expediente.
