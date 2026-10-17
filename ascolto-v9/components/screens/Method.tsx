'use client';
import { useCourse } from '@/lib/nav';

export default function Method() {
  const { course } = useCourse();
  return (
    <>
      <h2>O método</h2>
      <div className="card">
        <h3>Stephen Krashen e o Natural Approach</h3>
        <p>
          O linguista Stephen Krashen propôs, com Tracy Terrell, a <b>Abordagem Natural</b> (1983). A ideia central: a gente{' '}
          <b>adquire</b> uma língua quando entende mensagens nela, não quando decora regras.
        </p>
        <p>
          <b>Input compreensível (i+1):</b> o que acelera é ouvir e ler coisas que você entende quase tudo, com um pouco a
          mais do que seu nível atual.
        </p>
        <p>
          <b>Aquisição × aprendizagem:</b> gramática decorada ajuda a revisar o que você fala, mas a fluência vem da
          exposição repetida.
        </p>
        <p style={{ marginBottom: 0 }}>
          <b>Filtro afetivo:</b> ansiedade e medo de errar bloqueiam a aquisição. Por isso música funciona tão bem: é
          prazeroso e você repete sem perceber.
        </p>
      </div>
      <div className="card">
        <h3>Como este app aplica</h3>
        <p>
          🎵 <b>Uma música por semana</b>, ouvida todo dia de jeitos diferentes (às cegas, com letra, passiva, cantando
          junto).
        </p>
        <p>
          🗂️ <b>Cards com revisão espaçada</b> como apoio, incluindo o modo só áudio para treinar o ouvido.
        </p>
        <p>
          ✍️ <b>Frases suas</b>, com a cena em que você ouviu: o que você pega de ouvido vale mais do que qualquer lista
          pronta.
        </p>
        <p style={{ marginBottom: 0 }}>
          👨‍👩‍👧 <b>Em família</b>: cada um tem seu login e progresso; as letras são compartilhadas com a família.
        </p>
      </div>
      <div className="card">
        <h3>🎧 Imersão: o volume que falta</h3>
        <p>
          A música da semana é o estudo <b>intensivo</b>. Krashen também pede volume: horas de escuta <b>extensiva</b>,
          sem pausar nem traduzir. Registre os minutos na tela Início.
        </p>
        <div dangerouslySetInnerHTML={{ __html: course.meta.imm }} />
        <p style={{ marginBottom: 0 }}>
          <b>Truque:</b> filmes que vocês já conhecem de cor em português, assistidos no idioma novo. Como vocês já sabem a
          história, quase tudo vira input compreensível.
        </p>
      </div>
      <div className="card">
        <h3>Regras de ouro</h3>
        <p>
          1. Todo dia, nem que sejam 10 minutos.
          <br />
          2. Não pare para traduzir tudo. Deixe a música te levar.
          <br />
          3. Repita a mesma música até ela ficar "transparente".
          <br />
          4. Use as expressões em voz alta, mesmo sozinho.
        </p>
      </div>
    </>
  );
}
