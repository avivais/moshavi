import Image from 'next/image'
import Link from 'next/link'

export default function WhatsAppButton() {
    return (
        <Link
            href="https://chat.whatsapp.com/HX02K7Od1pMHCFJTp8Zdnc"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white font-poiret-one font-normal flex items-center space-x-1 text-sm md:text-base hover:text-gray-300 transition focus-ring rounded px-1"
            aria-label="Join our WhatsApp group"
        >
            <div className="w-5 h-5 ml-5">
                <Image src="/media/logo/whatsapp.png" width={20} height={20} alt="WhatsApp Logo" />
            </div>
            <span>Join Our Group</span>
        </Link>
    )
}