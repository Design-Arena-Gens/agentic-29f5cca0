export const metadata = {
  title: "Peekaboo Johny - Video Generator",
  description: "Cartoon peekaboo character singing Johny Johny Yes Papa with video export"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
