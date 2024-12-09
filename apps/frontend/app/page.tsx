import { Metadata } from 'next';
import HomePage from '../app/home-page';

export const metadata: Metadata = {
  title: 'GLADOS',
  description: 'GLADOS: A platform for running experiments',
};

const IndexPage = () => {
  return <HomePage />;
};

export default IndexPage;