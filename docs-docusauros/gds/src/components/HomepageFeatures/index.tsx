import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  image: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Vigilância Participativa',
    image: '/img/home-01.png',
    description: (
      <>
        Sistema de vigilância em saúde pública que permite cidadãos reportarem sintomas e informações de saúde,
        contribuindo para detecção precoce de surtos e epidemias.
      </>
    ),
  },
  {
    title: 'Monitoramento Epidemiológico',
    image: '/img/home-02.png',
    description: (
      <>
        Plataforma completa para coleta, análise e visualização de dados epidemiológicos,
        com suporte a mapas interativos e relatórios georreferenciados.
      </>
    ),
  },
  {
    title: 'Educação em Saúde',
    image: '/img/home-03.png',
    description: (
      <>
        Trilhas de aprendizado, conteúdos educacionais e quizzes para capacitação em saúde pública,
        integrado com sistema de créditos acadêmicos.
      </>
    ),
  },
];

function Feature({title, image, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <img 
          src={image} 
          alt={title}
          className={styles.featureImage}
          role="img"
        />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
