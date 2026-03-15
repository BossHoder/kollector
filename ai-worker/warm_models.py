import logging

import main as ai_main


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    ai_main.warm_models()
    print("AI models warmed successfully.")


if __name__ == "__main__":
    main()
