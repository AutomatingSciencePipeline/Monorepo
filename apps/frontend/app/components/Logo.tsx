import Image from 'next/image';

export const Logo = () => {
	return <Image className='rounded-full' src="/images/glados-logo.jpg" alt="GLADOS" width={40} height={40} />;
};
