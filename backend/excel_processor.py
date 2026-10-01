import pandas as pd
import numpy as np
import os
import uuid
import json
from typing import Optional

# In-memory store for uploaded datasets
datasets = {}

class DatasetInfo:
    def __init__(self, df: pd.DataFrame, filename: str):
        self.id = str(uuid.uuid4())
        self.df = df
        self.filename = filename
        self.row_count = len(df)
        self.col_count = len(df.columns)
        self.columns = list(df.columns)
        self.dtypes = {col: str(df[col].dtype) for col in df.columns}
        self.numeric_columns = list(df.select_dtypes(include=[np.number]).columns)
        self.categorical_columns = list(df.select_dtypes(include=['object', 'category']).columns)


def parse_file(file_path: str, filename: str) -> DatasetInfo:
    """Parse an Excel or CSV file and store it in memory."""
    ext = os.path.splitext(filename)[1].lower()
    
    if ext == '.csv':
        df = pd.read_csv(file_path, encoding='utf-8', on_bad_lines='skip')
    elif ext in ['.xlsx', '.xls']:
        df = pd.read_excel(file_path, engine='openpyxl')
    else:
        raise ValueError(f"Unsupported file format: {ext}")
    
    # Clean column names
    df.columns = [str(col).strip() for col in df.columns]
    
    # Replace NaN/Inf with None for JSON serialization
    df = df.replace([np.inf, -np.inf], np.nan)
    
    dataset = DatasetInfo(df, filename)
    datasets[dataset.id] = dataset
    return dataset


def get_dataset(dataset_id: str) -> Optional[DatasetInfo]:
    """Retrieve a stored dataset by ID."""
    return datasets.get(dataset_id)


def get_data_rows(dataset_id: str, limit: int = 100) -> dict:
    """Get data rows as JSON-serializable dict."""
    dataset = get_dataset(dataset_id)
    if not dataset:
        return None
    
    df = dataset.df.head(limit)
    # Convert to records, handling NaN
    records = json.loads(df.to_json(orient='records', default_handler=str))
    
    return {
        "id": dataset.id,
        "filename": dataset.filename,
        "columns": dataset.columns,
        "dtypes": dataset.dtypes,
        "row_count": dataset.row_count,
        "col_count": dataset.col_count,
        "rows": records,
        "showing": min(limit, dataset.row_count)
    }


def get_summary_stats(dataset_id: str) -> dict:
    """Generate summary statistics for the dataset."""
    dataset = get_dataset(dataset_id)
    if not dataset:
        return None
    
    df = dataset.df
    stats = {}
    
    # Numeric stats
    if dataset.numeric_columns:
        numeric_df = df[dataset.numeric_columns]
        desc = numeric_df.describe().round(2)
        stats["numeric_summary"] = json.loads(desc.to_json())
        
        # Missing values
        missing = df.isnull().sum()
        stats["missing_values"] = {col: int(val) for col, val in missing.items() if val > 0}
        
        # Correlation matrix
        if len(dataset.numeric_columns) >= 2:
            corr = numeric_df.corr().round(3)
            stats["correlation"] = json.loads(corr.to_json())
    
    # Categorical stats
    if dataset.categorical_columns:
        cat_stats = {}
        for col in dataset.categorical_columns[:10]:  # Limit to first 10
            value_counts = df[col].value_counts().head(10)
            cat_stats[col] = {
                "unique_count": int(df[col].nunique()),
                "top_values": {str(k): int(v) for k, v in value_counts.items()}
            }
        stats["categorical_summary"] = cat_stats
    
    stats["row_count"] = dataset.row_count
    stats["col_count"] = dataset.col_count
    stats["columns"] = dataset.columns
    stats["numeric_columns"] = dataset.numeric_columns
    stats["categorical_columns"] = dataset.categorical_columns
    
    return stats


def get_chart_data(dataset_id: str) -> dict:
    """Generate chart-ready data for the frontend."""
    dataset = get_dataset(dataset_id)
    if not dataset:
        return None
    
    df = dataset.df
    charts = {}
    
    # Distribution data for numeric columns (histograms)
    if dataset.numeric_columns:
        distributions = {}
        for col in dataset.numeric_columns[:6]:  # Limit to 6
            clean_data = df[col].dropna()
            if len(clean_data) > 0:
                hist, bin_edges = np.histogram(clean_data, bins=min(20, len(clean_data)))
                distributions[col] = {
                    "values": hist.tolist(),
                    "bins": [round(float(b), 2) for b in bin_edges],
                    "labels": [f"{round(float(bin_edges[i]), 1)}-{round(float(bin_edges[i+1]), 1)}" for i in range(len(hist))]
                }
        charts["distributions"] = distributions
    
    # Bar chart data for categorical columns
    if dataset.categorical_columns:
        bar_data = {}
        for col in dataset.categorical_columns[:6]:
            value_counts = df[col].value_counts().head(10)
            bar_data[col] = {
                "labels": [str(k) for k in value_counts.index],
                "values": value_counts.values.tolist()
            }
        charts["bar_charts"] = bar_data
    
    # Scatter plot data (first 2 numeric columns)
    if len(dataset.numeric_columns) >= 2:
        x_col = dataset.numeric_columns[0]
        y_col = dataset.numeric_columns[1]
        sample = df[[x_col, y_col]].dropna().head(200)
        charts["scatter"] = {
            "x_column": x_col,
            "y_column": y_col,
            "data": json.loads(sample.to_json(orient='records'))
        }
    
    # Line chart data (if there's a potential time/sequence column)
    if dataset.numeric_columns:
        first_num = dataset.numeric_columns[0]
        line_data = df[first_num].dropna().head(50).tolist()
        charts["line"] = {
            "column": first_num,
            "data": [{"index": i, "value": round(float(v), 2)} for i, v in enumerate(line_data)]
        }
    
    # Pie chart data (first categorical column)
    if dataset.categorical_columns:
        pie_col = dataset.categorical_columns[0]
        value_counts = df[pie_col].value_counts().head(8)
        charts["pie"] = {
            "column": pie_col,
            "data": [{"name": str(k), "value": int(v)} for k, v in value_counts.items()]
        }
    
    # Correlation heatmap matrix
    if len(dataset.numeric_columns) >= 2:
        corr = df[dataset.numeric_columns].corr().round(3)
        heatmap_data = []
        cols = list(corr.columns)
        for i, row_name in enumerate(cols):
            for j, col_name in enumerate(cols):
                val = corr.iloc[i, j]
                if not np.isnan(val):
                    heatmap_data.append({"x": col_name, "y": row_name, "value": float(val)})
        charts["heatmap"] = {
            "columns": cols,
            "data": heatmap_data
        }
    
    charts["available_columns"] = {
        "numeric": dataset.numeric_columns,
        "categorical": dataset.categorical_columns,
        "all": dataset.columns
    }
    
    return charts


def get_data_summary_for_ai(dataset_id: str) -> str:
    """Generate a text summary of the dataset for AI context."""
    dataset = get_dataset(dataset_id)
    if not dataset:
        return "No dataset loaded."
    
    df = dataset.df
    summary_parts = []
    
    summary_parts.append(f"Dataset: {dataset.filename}")
    summary_parts.append(f"Shape: {dataset.row_count} rows × {dataset.col_count} columns")
    summary_parts.append(f"Columns: {', '.join(dataset.columns)}")
    
    # Numeric summary
    if dataset.numeric_columns:
        summary_parts.append(f"\nNumeric columns: {', '.join(dataset.numeric_columns)}")
        desc = df[dataset.numeric_columns].describe().round(2)
        summary_parts.append(f"\nStatistics:\n{desc.to_string()}")
    
    # Categorical summary
    if dataset.categorical_columns:
        summary_parts.append(f"\nCategorical columns: {', '.join(dataset.categorical_columns)}")
        for col in dataset.categorical_columns[:5]:
            top = df[col].value_counts().head(5)
            summary_parts.append(f"\n{col} top values: {dict(top)}")
    
    # Missing data
    missing = df.isnull().sum()
    missing = missing[missing > 0]
    if len(missing) > 0:
        summary_parts.append(f"\nMissing values: {dict(missing)}")
    
    # Sample rows
    sample = df.head(5).to_string()
    summary_parts.append(f"\nSample data (first 5 rows):\n{sample}")
    
    return "\n".join(summary_parts)


def get_data_cleaning_suggestions(dataset_id: str) -> dict:
    """Analyze dataset for missing values, duplicates, and outliers to provide to AI."""
    dataset = get_dataset(dataset_id)
    if not dataset:
        return None
        
    df = dataset.df
    
    issues = {
        "missing_values": {},
        "duplicates": int(df.duplicated().sum()),
        "outliers": {}
    }
    
    # Missing values
    missing = df.isnull().sum()
    for col, count in missing.items():
        if count > 0:
            issues["missing_values"][col] = int(count)
            
    # Outliers (using Z-score > 3 as a simple heuristic)
    if dataset.numeric_columns:
        for col in dataset.numeric_columns:
            if df[col].notnull().any():
                col_data = df[col].dropna()
                if len(col_data) > 0 and col_data.std() > 0:
                    z_scores = np.abs((col_data - col_data.mean()) / col_data.std())
                    outlier_count = int((z_scores > 3).sum())
                    if outlier_count > 0:
                        issues["outliers"][col] = outlier_count
                        
    return issues

