import pandas as pd


class DataLoader:
    def __init__(self, csv_files: list[str]):
        self.csv_files = csv_files
        self.dfs = [pd.read_csv(f) for f in csv_files]
