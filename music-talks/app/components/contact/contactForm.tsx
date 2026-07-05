export default function ContactForm() {
  return (
    <form className="flex flex-col gap-4 w-full max-w-md">
      <input
        className="w-full px-4 py-2 border-2 border-black rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        type="text"
        placeholder="Subject"
      />
      <input
        className="w-full px-4 py-2 border-2 border-black rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        type="email"
        placeholder="Email"
      />
      <textarea
        className="w-full px-4 py-2 border-2 border-black rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        rows={6}
        placeholder="Message"
      />
      <button
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors duration-200 font-medium"
        type="submit"
      >
        Submit
      </button>
    </form>
  );
}