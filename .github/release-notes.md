**ContaClara 4.7.2 — atualizações com limpeza automática de armazenamento.**

Baixe **ContaClara-Windows-x64.zip**, extraia a pasta inteira e abra **saldo.exe**.

### Menos arquivos acumulados

- ZIPs baixados, downloads parciais e pastas de extração são removidos após cada tentativa de atualização. O pacote extraído e pronto para instalar é preservado enquanto o aplicativo estiver aberto.
- Depois que a nova versão abre, lê os dados e recebe a confirmação do atualizador, as versões antigas de `updates/versions/` são removidas. A limpeza também alcança o acúmulo deixado por versões anteriores.
- Se a atualização falhar, a versão anterior continua disponível para recuperação. Arquivos ainda bloqueados pelo Windows são tratados novamente na próxima abertura ou atualização.
- Os registros financeiros, backups automáticos e cópias feitas antes de atualizar são preservados. Pastas com dados, backups ou links e arquivos fora da área gerenciada não são apagados.

A pasta portátil originalmente extraída pelo usuário continua servindo como entrada para abrir a versão atualizada e deve ser mantida. Downloads manuais e outras pastas de instalação não são removidos automaticamente.

### Atualização e verificação

Atualize em **Configurações → Atualizações**. A limpeza fica ativa ao abrir esta versão, inclusive para quem atualiza a partir de uma versão antiga.

Testes cobrem a remoção de versões e temporários, a preservação de dados e backups, a proteção contra links e estados inválidos e a espera pela confirmação antes da limpeza. O pacote passa também pelos testes nativos no Windows: duas atualizações seguidas, recuperação após falha, atalho original e preservação de dados. **SHA256SUMS.txt** contém os checksums dos ZIPs.
