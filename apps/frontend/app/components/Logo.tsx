import Image from 'next/image';

export const Logo = () => {
	return <Image className='rounded-full' src="/images/glados-logo.png" alt="GLADOS" width={40} height={40} />;
	// return <FontAwesomeIcon icon={faFire} className={'text-orange-400 h-8'} />;
};
