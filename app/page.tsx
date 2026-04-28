import type { NextPage } from "next";
import Head from "next/head";
import AdhanPlayer from "./components/AdhanPlayer";

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Adhan Al Assalet - Tunisie</title>
        <meta
          name="description"
          content="Application d'Adhan pour la prière de Assalet en Tunisie"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <AdhanPlayer />
      </main>
    </>
  );
};

export default Home;
