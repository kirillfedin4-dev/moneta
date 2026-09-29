import { motion } from 'motion/react';

export function SplitText({
  text,
  className = '',
  delay = 40,
  duration = 0.6,
  tag = 'p',
}) {
  const Tag = tag;
  const chars = Array.from(text);

  return (
    <Tag className={className} style={{ color: 'inherit' }}>
      {chars.map((char, i) => (
        <motion.span
          key={`char-${i}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: (i * delay) / 1000,
            duration,
            ease: 'easeOut',
          }}
          style={{ display: 'inline-block', whiteSpace: 'pre' }}
        >
          {char}
        </motion.span>
      ))}
    </Tag>
  );
}

export default SplitText;