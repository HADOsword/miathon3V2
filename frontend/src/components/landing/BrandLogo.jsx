const logoSizes = {
  default: {
    image: "h-10 w-auto sm:h-11",
  },
  compact: {
    image: "h-8 w-auto",
  },
};

function BrandLogo({ compact = false }) {
  const size = compact ? logoSizes.compact : logoSizes.default;

  return (
    <img
      src="/Logo.png"
      alt="CVMentor AI"
      className={`${size.image} block shrink-0 select-none object-contain`}
      draggable="false"
    />
  );
}

export default BrandLogo;
