# Manual do Usuario - AltaVoz

## Transcricao e Identificacao de Quem Falou

**Versao 1.0** - Uso Pessoal - 100% Local (seu computador)

---

## Antes de Comecar: Instalacao do Node.js

O **AltaVoz** precisa do **Node.js** instalado no seu computador para funcionar. O Node.js e uma plataforma gratuita que permite executar aplicacoes modernas no seu PC.

### Passo 1: Baixar o Node.js

1. Abra seu navegador (Chrome, Firefox, Edge, etc.)
2. Acesse o site oficial: **https://nodejs.org/**
3. Voce vera dois botoes verdes:
   - **LTS** (Recomendado) - Versao mais estavel e testada
   - Current - Versao mais recente (pode ter bugs)
4. Clique no botao **LTS** (recomendado para maioria dos usuarios)

### Passo 2: Instalar o Node.js

**No Windows:**
1. Após baixar, clique duas vezes no arquivo baixado (ex: `node-v20.x.x-x64.msi`)
2. Clique em "Next" em todas as telas
3. Aceite os termos de uso
4. Mantenha as opcoes padrao de instalacao
5. Clique em "Install" e aguarde
6. Quando terminar, clique em "Finish"

**No Mac:**
1. Após baixar, clique duas vezes no arquivo `.pkg`
2. Siga as instrucoes do instalador
3. Digite sua senha quando solicitado
4. Aguarde a conclusao da instalacao

**No Linux:**
- Use o gerenciador de pacotes da sua distribuicao ou baixe do site oficial

### Passo 3: Verificar a Instalacao

1. No Windows: Pressione `Windows + R`, digite `cmd` e pressione Enter
2. No Mac/Linux: Abra o Terminal
3. Digite o comando: `node --version`
4. Se aparecer um numero (ex: `v20.11.0`), esta instalado corretamente!

### Passo 4: Iniciar o AltaVoz

**No Windows:**
1. V ate a pasta onde esta o AltaVoz
2. Dê dois cliques no arquivo `iniciar.bat`
3. O sistema instalara as dependencias automaticamente (primeira vez apenas)
4. O navegador abrira com o AltaVoz

**No Mac/Linux:**
1. Abra o Terminal na pasta do AltaVoz
2. Digite: `./iniciar.sh`
3. Aguarde a abertura automatica no navegador

### Problemas Comuns

| Problema | Solucao |
|----------|---------|
| "Node.js nao encontrado" | Reinstale o Node.js e reinicie o computador |
| "Acesso negado" no Windows | Execute `iniciar.bat` como Administrador (botao direito) |
| Dependencias nao instalam | Verifique se ha conexao com internet na primeira execucao |
| Porta ja em uso | Feche outros programas e tente novamente |

---

## Bem-vindo ao AltaVoz!

O **AltaVoz** e um programa que transforma gravacoes de audio em texto escrito, mostrando **quem falou o que** e **quando**. Tudo acontece no seu computador - nada e enviado para a internet.

### Para que serve?

- Transformar reunioes, entrevistas ou conversas em texto
- Saber exatamente quem disse cada coisa
- Ter um registro confiavel com "impressao digital" do audio
- Exportar relatorios completos com horarios

### O que voce PRECISA saber antes de comecar:

| Requisito | Detalhe |
|-----------|---------|
| Formato do audio | MP3 ou M4A |
| Duracao maxima | 30 minutos por audio |
| Quantidade | Maximo de 2 audios por vez |
| Memoria recomendada | 8 GB de RAM (funciona com menos, mas mais lento) |
| Internet | NAO precisa - funciona offline! |

---

## Mapa dos 5 Passos

O AltaVoz funciona em 5 etapas. Voce so avanca quando completa a anterior:

```
[1] -> [2] -> [3] -> [4] -> [5]
 |      |      |      |      |
Importar Amostras Verificar Processar Relatorio
 audio   de voz  teste   texto   final
```

---

## PASSO 1 - Importar Audio

### O que voce vai fazer aqui:
Entregar a gravacao que quer transcrever.

### Como importar:

**Opcao A - Arrastar e soltar:**
1. Abra a pasta onde esta seu audio
2. Clique e segure o arquivo
3. Arraste ate a area pontilhada na tela
4. Solte!

**Opcao B - Escolher manualmente:**
1. Clique no botao "Ou escolha os arquivos manualmente"
2. Navegue ate encontrar seu audio
3. Selecione o arquivo e clique em "Abrir"

### O sistema verifica automaticamente:

| Verificacao | O que significa |
|-------------|-----------------|
| Formato | So aceita MP3 ou M4A |
| Duracao | Maximo 30 minutos |
| Integridade | Calcula a "impressao digital" (hash) |
| Tamanho | Maximo 400 MB |

### Problemas comuns:

| Mensagem | O que fazer |
|----------|-------------|
| "So aceitamos MP3 ou M4A" | Converta o audio para MP3 usando um conversor online |
| "Acima de 30 minutos" | Divida o audio em partes menores |
| "Nao foi possivel ler" | O arquivo pode estar danificado - tente outro |
| "Lote ja tem 2 audios" | Remova um audio ou termine o processo atual |

### Quando avancar:
Quando aparecer o botao "Continuar" ativado (colorido), clique nele!

---

## PASSO 2 - Amostras de Voz

### O que voce vai fazer aqui:
Ensinar o sistema a reconhecer a voz de cada pessoa que aparece no audio.

### Por que isso e importante?
O sistema precisa "aprender" como e a voz de cada participante para saber **quem falou o que**.

### Regras importantes:

| Regra | Detalhe |
|-------|---------|
| Minimo de pessoas | 2 amostras (pode ser a mesma pessoa em momentos diferentes) |
| Duracao da amostra | Entre 10 e 30 segundos |
| Tipo de fala | Fale naturalmente, como na conversa original |
| Ambiente | Prefira locais silenciosos |

### Duas formas de criar amostras:

#### FORMA 1 - Gravar na hora

1. Digite o nome da pessoa (ex: "Maria", "Dr. Souza", "Cliente")
2. Clique em "Gravar agora"
3. Autorize o microfone se o navegador pedir
4. Fale por 10-30 segundos:
   - Pode ler um texto
   - Pode contar sobre seu dia
   - Use o tom de voz normal da pessoa
5. Clique no botao vermelho para parar
6. Pronto!

**Dicas para uma boa gravacao:**
- Fale claro e em volume normal
- Feche janelas e portas para reduzir ruido
- Desligue celulares proximos
- Nao fale rapido demais

#### FORMA 2 - Importar arquivo

1. Digite o nome da pessoa
2. Clique em "Importar arquivo"
3. Escolha um audio curto (10-30 segundos) dessa pessoa falando
4. O sistema verifica automaticamente
5. Pronto!

Formatos aceitos para amostra: MP3, M4A, WAV, OGG, WEBM

### Como saber se a amostra ficou boa:

| Sinal | Significado |
|-------|-------------|
| "Amostra guardada" | Tudo certo! |
| "Volume baixo" | Funciona, mas grave outra mais alta se possivel |
| "Curta demais" | Grave novamente por mais tempo (minimo 10s) |
| "Longa demais" | Use apenas 30 segundos |

### Quando avancar:
Quando tiver pelo menos 2 amostras e o botao "Continuar" estiver colorido!

---

## PASSO 3 - Verificacao (Teste de Reconhecimento)

### O que voce vai fazer aqui:
Confirmar se o sistema identificou corretamente as vozes no inicio do audio.

### Como funciona o teste:

1. O sistema pega os primeiros segundos do seu audio
2. Compara com as amostras de voz que voce cadastrou
3. Mostra quem ele acha que esta falando
4. Voce confirma se esta certo ou errado

### Entendendo a confianca:

| Nivel | Porcentagem | O que fazer |
|-------|-------------|-------------|
| Alta | 80% - 100% | Pode confiar! Confirme. |
| Media | 50% - 79% | Confira com atencao. Se conhecer a voz, confirme. |
| Baixa | 0% - 49% | Provavelmente errado. Refaca as amostras. |

### Se estiver CORRETO:

1. Clique em "Confirmar identificacao"
2. Uma mensagem aparece: "Sua confirmacao ficou registrada"
3. O sistema libera o proximo passo!

### Se estiver ERRADO:

1. Clique em "Refazer amostras"
2. Voce volta para o Passo 2
3. Melhore as amostras:
   - Grave em local mais silencioso
   - Fale mais alto e claro
   - Use amostras mais longas (perto de 30s)
4. Volte para o teste

### Dicas para melhor reconhecimento:

- Use amostras da mesma pessoa que fala no inicio do audio principal
- Amostra com volume bom ajuda muito
- Grave a amostra no mesmo tipo de ambiente do audio principal
- Cadastre todas as pessoas que aparecem no audio

### Quando avancar:
Quando todos os audios tiverem a identificacao confirmada!

---

## PASSO 4 - Processamento (Transcricao)

### O que voce vai fazer aqui:
Aguardar o sistema transformar o audio em texto com identificacao de vozes.

### Quanto tempo demora?

| Duracao do audio | Tempo estimado |
|------------------|-----------------|
| 5 minutos | 2-5 minutos |
| 15 minutos | 10-20 minutos |
| 30 minutos | 25-45 minutos |

Tempo varia conforme a velocidade do seu computador

### O que acontece durante o processamento:

1. Analise do audio - O sistema "ouve" todo o arquivo
2. Separacao de vozes - Identifica quando cada pessoa fala
3. Transcricao - Converte fala em texto
4. Marcacao de horarios - Adiciona quando cada frase comeca e termina
5. Revisao interna - Verifica consistencia

### Importante:

**Faca:**
- Mantenha a aba aberta
- Deixe o computador ligado
- Aguarde pacientemente
- Use outros programas normalmente

**Nao faca:**
- Fechar a janela do navegador
- Colocar em modo de suspensao
- Atualizar a pagina
- Desligar o computador

### Quando termina:

- Aparece uma mensagem: "Processamento concluido!"
- O botao "Ver relatorio" fica colorido
- Voce pode clicar para ir ao Passo 5

### O que vem no resultado:

Cada trecho transcrito tera:
- Horario de inicio e fim (ex: 00:01:23 - 00:01:45)
- Nome de quem falou (baseado nas suas amostras)
- Texto exato do que foi dito

---

## PASSO 5 - Relatorio Final

### O que voce vai fazer aqui:
Revisar, editar e exportar o resultado da transcricao.

### O que voce ve no relatorio:

Exemplo de transcricao:

```
RELATORIO DE TRANSCRICAO
========================

Arquivo: audio-reuniao.mp3
Duracao: 15 minutos e 32 segundos
Processado em: 20/08/2025 as 14:30

TRANSCRICAO COMPLETA
====================

[00:00:00 - 00:00:15]
Maria:
"Bom dia a todos. Vamos comecar a reuniao?"

[00:00:16 - 00:00:28]
Dr. Souza:
"Bom dia, Maria. Estou pronto."

[00:00:29 - 00:00:45]
Maria:
"Otimo. O primeiro ponto da pauta e..."
```

### Como editar o texto:

Se alguma palavra ficou errada:

1. Clique no trecho que quer corrigir
2. Edite diretamente no campo de texto
3. Suas alteracoes sao salvas automaticamente
4. O sistema registra que houve edicao (no diario)

### Opcoes de exportacao:

**1. Baixar Relatorio Completo**
- Formato: PDF ou TXT
- Inclui transcricao completa, horarios, quem falou, selo de integridade

**2. Copiar Texto**
- Copia toda a transcricao para a area de transferencia
- Cole no Word, Google Docs, email, etc.

**3. Baixar Diario de Integridade**
- Registro tecnico de tudo que aconteceu
- Util para provar que o processo foi correto

### Selos de Integridade:

O relatorio inclui informacoes que provam que o audio nao foi alterado:

| Selo | O que prova |
|------|-------------|
| Hash SHA-256 | O arquivo original nao mudou |
| Carimbo de tempo | Quando cada acao aconteceu |
| Diario completo | Trilha de auditoria de tudo |
| Confirmacoes | Voce revisou e aprovou as identificacoes |

### Dicas para usar o relatorio:

- Envie por email - Anexe o PDF
- Guarde junto - Salve audio + relatorio na mesma pasta
- Imprima - Se precisar de versao fisica
- Revise - Leia tudo antes de usar oficialmente

---

## Ferramentas Extras

### Dicionario de Termos

**Onde encontrar:** Botao "Dicionario" no topo da tela

**Para que serve:** Explica todos os termos tecnicos em linguagem simples.

Termos incluidos:

| Termo | Explicacao rapida |
|-------|-------------------|
| Transcricao | Texto escrito do audio |
| Diarizacao | Separacao de vozes |
| Amostra de voz | Gravacao curta para treinar o sistema |
| Confianca | Certeza do sistema (0-100%) |
| Hash SHA-256 | Impressao digital do arquivo |
| Cadeia de custodia | Registro de tudo que aconteceu |
| CPU | Processador do computador |
| Reprodutivel | Mesmo resultado sempre |

### Diario de Integridade

**Onde encontrar:** Botao "Diario" no topo da tela

**O que mostra:**
- Lista de todas as acoes desde que voce abriu o sistema
- Data e hora exatas de cada evento
- Detalhes tecnicos (como hashes e confirmacoes)

**Como usar:**
1. Clique em "Diario"
2. Veja a lista completa
3. Clique em "Baixar" para salvar como arquivo de texto

---

## Perguntas Frequentes (FAQ)

### 1. Meus dados saem do meu computador?
NAO! Tudo fica no seu computador. O AltaVoz funciona 100% offline, sem enviar nada para internet.

### 2. Preciso instalar algo?
NAO! Basta abrir o site no seu navegador (Chrome, Firefox, Edge).

### 3. Posso usar no celular?
SIM, mas funciona melhor no computador. No celular, use fones de ouvido para gravar amostras.

### 4. E se o audio tiver mais de 30 minutos?
Divida em partes menores usando um programa gratuito como Audacity ou um cortador de MP3 online.

### 5. O sistema reconhece sotaques regionais?
SIM, mas quanto mais parecida for a amostra do audio principal, melhor funciona.

### 6. Posso cancelar no meio do processo?
SIM, voce pode fechar a janela e voltar depois. Os relatorios salvos ficam disponiveis.

### 7. O que acontece se eu errar uma amostra?
Volte ao Passo 2, remova a amostra errada e grave uma nova.

### 8. Quanto tempo leva para processar?
Depende do tamanho do audio e da velocidade do seu computador. Em media, 1 minuto de audio = 1-2 minutos de processamento.

### 9. Posso editar o texto depois?
SIM, no Passo 5 voce pode corrigir qualquer palavra antes de exportar.

### 10. O relatorio vale como prova juridica?
O sistema maximiza integridade e rastreabilidade, mas a aceitacao depende do juiz e da legislacao local.

---

## Precisa de Ajuda?

### Se algo der errado:

1. Leia a mensagem de erro - Ela explica o problema
2. Consulte este manual - Veja a secao relacionada
3. Abra o Diario - Veja o que aconteceu passo a passo
4. Tente de novo - Muitos erros se resolvem repetindo a acao

### Dicas gerais:

- Use fones de ouvido para ouvir melhor
- Fique em ambiente silencioso ao gravar amostras
- Mantenha o computador ligado na tomada durante processamentos longos
- Salve seus relatorios em lugar seguro

---

## Glossario Completo

**Amostra de Voz**
Uma gravacao curta (10 a 30 segundos) da voz de uma pessoa. O sistema usa essa amostra para reconhecer a mesma pessoa no audio completo.

**Cadeia de Custodia**
O registro passo a passo de tudo o que aconteceu com a evidencia: quem importou, quando, quais analises foram feitas. Quanto mais completa essa trilha, mais confiavel e o material.

**Confianca (Nivel de)**
Uma nota de 0 a 100% que mostra o quanto o sistema tem certeza de uma identificacao. Alta (80% ou mais): pode confiar. Media: confira com atencao. Baixa: melhore a amostra de voz.

**CPU (Processamento em)**
O trabalho e feito pelo processador comum do computador, sem precisar de placa de video. Por isso pode demorar mais - mas funciona em qualquer notebook comum.

**Diarizacao (Separacao de Vozes)**
E a parte do sistema que percebe quando uma pessoa para de falar e outra comeca, separando o audio por quem falou - mesmo sem saber os nomes ainda.

**Hash (Impressao Digital SHA-256)**
Um codigo unico calculado a partir do arquivo de audio, como um RG do arquivo. Se um unico segundo do audio for alterado, o codigo muda completamente - e assim que se prova que a gravacao nao foi modificada.

**Reprodutivel (Resultado)**
O mesmo audio, com as mesmas amostras de voz, gera sempre o mesmo relatorio. Isso permite que outra pessoa refaca o processo e chegue ao mesmo resultado - um sinal de seriedade da evidencia.

**Transcricao**
E o texto escrito de tudo o que foi dito no audio, com o horario (hh:mm:ss) em que cada fala comeca e termina.

---

## Parabens!

Agora voce conhece tudo sobre o **AltaVoz**!

Lembre-se:
- Siga os 5 passos na ordem
- Capriche nas amostras de voz
- Sempre confirme as identificacoes
- Baixe e guarde seus relatorios

Boa transcricao!

---

Manual criado para ser compreendido por adolescentes e idosos, com linguagem simples e exemplos visuais.

AltaVoz v1.0 - Software livre para uso pessoal.
