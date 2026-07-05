import ContactForm from "../components/contact/contactForm";

export default function Contact() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Contact Us</h1>
        <ContactForm />
      </div>
    </div>
  );
}